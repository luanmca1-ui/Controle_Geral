# Caixa | The Barber Express

Painel de projeção de caixa por unidade, alimentado ao vivo pela planilha
`BUnificada`. Responde a uma pergunta só: com o saldo de hoje mais o que deve
entrar, dá para pagar as contas do período?

Web app responsivo instalável (PWA). Um código só, funciona em iOS e Android
pelo navegador e pode ser adicionado à tela de início.

---

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha as credenciais
npm run dev                  # http://localhost:3000
```

Build de produção:

```bash
npm run build && npm start
```

---

## Credenciais do Google

O app lê e escreve na planilha através de uma conta de serviço.

1. No [Google Cloud Console](https://console.cloud.google.com), crie um projeto
2. Ative a **Google Sheets API**
3. Crie uma **conta de serviço** e gere uma chave JSON
4. Abra a planilha `BUnificada`, clique em Compartilhar e adicione o e-mail da
   conta de serviço como **Editor**

O acesso precisa ser de Editor, e não de Leitor, porque o app grava o saldo
informado pela gestora de volta na aba `ContaStone`.

No `.env.local`:

```
SPREADSHEET_ID=1LJemTv829bzqnYejPiQfE7OiGchyIYk2rTEnpohHZrk
GOOGLE_SERVICE_ACCOUNT_EMAIL=painel-caixa@seu-projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

A chave privada vai entre aspas, com os `\n` preservados exatamente como
aparecem no arquivo JSON.

---

## O que a planilha precisa ter

### Aba `Faturamento` (cabeçalho na linha 1)

| Coluna | Campo |
|---|---|
| T | Total |
| U | Crédito |
| V | Débito |
| W | Dinheiro |
| X | Pix |
| AB | Unidade Corrigida |
| AC | Data |
| AE | Dia da Semana |

### Aba `BContasFixas` (cabeçalho na linha 3)

| Coluna | Campo |
|---|---|
| B | Categoria |
| C | Favorecido |
| D | Valor |
| E | Data de Vencimento |
| F | Data de Pagamento |
| H | Boleto Disponibilizado |
| M | Status Pagamento |
| N | Item Padronizado |
| P | Unidade Corrigida |

### Aba `ContaStone` (cabeçalho na linha 1)

| Coluna | Campo |
|---|---|
| A | Unidade |
| B | Saldo Atual |
| C | Atualizado em |
| D | Atualizado por |
| E | Insumo semanal |

A coluna **E** guarda o gasto médio semanal de insumos daquela unidade, que é
o valor lançado toda terça na projeção. Sem ela, a despesa é ignorada e o
painel avisa.

**Crie as colunas C, D e E antes de usar.** Sem elas o app grava o saldo, mas
ninguém consegue saber de quando ele é, e a projeção passa a ser feita em cima
de um número possivelmente velho sem nenhum aviso.

### Aba `Acessos` (cabeçalho na linha 1)

Quem pode entrar no painel. Uma linha por pessoa.

| Coluna | Campo | Conteúdo |
|---|---|---|
| A | Nome | aparece no topo da tela e é gravado como autor do saldo |
| B | Código | o código que a pessoa digita para entrar |
| C | Perfil | `dono`, `gestora` ou `gerente` |
| D | Unidades | vazio = todas; ou os nomes padronizados separados por vírgula |
| E | Ativo | `Sim` ou `Não`; célula vazia conta como Sim |

Exemplo:

| Nome | Código | Perfil | Unidade | Ativo |
|---|---|---|---|---|
| Luan | LUAN-8842 | dono | | Sim |
| Camila | GEST-3170 | gestora | | Sim |
| Rafael | METR-5529 | gerente | Metrópole | Sim |
| Bruno | SUP-4416 | gestora | Metrópole, Marabá, Castanheira | Sim |

Escopo e permissão são coisas separadas:

- **A coluna D define o que a pessoa vê**, seja qual for o perfil. Vazia
  libera a rede inteira. Com nomes, só aqueles. Aceita vírgula ou ponto e
  vírgula: `Metrópole, Marabá, Castanheira`.
- **O perfil define se ela pode editar.** `dono` e `gestora` editam saldos e
  ajustes; `gerente` é somente leitura.

Combinando os dois:

| Quero | Perfil | Unidades |
|---|---|---|
| Dono, vê e edita tudo | dono | vazio |
| Gestora da rede | gestora | vazio |
| Supervisor de 3 lojas, edita as 3 | gestora | Metrópole, Marabá, Castanheira |
| Gerente de uma loja, só olha | gerente | Metrópole |
| Sócio que acompanha 5 lojas sem mexer | gerente | as 5, separadas por vírgula |

Os nomes precisam ser idênticos aos da coluna A da ContaStone. Um nome
escrito errado é ignorado em silêncio, e a pessoa vê uma unidade a menos do
que deveria.

Para revogar um acesso, escreva `Não` na coluna Ativo ou apague a linha. Vale
em até um minuto, sem redeploy. O perfil e a unidade são reconferidos na
planilha a cada requisição, então mudar a coluna C ou D também vale na hora,
sem a pessoa precisar sair e entrar de novo.

Sobre os códigos: use algo que não seja adivinhável, tipo `METR-5529`, e não
o nome da unidade sozinho. Um código por pessoa, nunca compartilhado, senão
o registro de quem alterou o saldo perde o sentido.

### Aba `AppConfig`

Criada automaticamente na primeira vez que você salvar algo em Ajustes.
Guarda as taxas da maquininha, a janela da média, a reserva mínima e o limite
de dias para considerar um saldo desatualizado.

Se alguma coluna mudar de lugar na planilha, o único arquivo a ajustar é
`src/lib/sheets.ts`, no objeto `COLUNAS`.

---

## Como a projeção é calculada

**Entrada em conta.** Só crédito, débito e pix. Dinheiro em espécie fica de
fora porque não passa pela conta bancária. Como o crédito cai em D+0, o que se
desconta é a taxa de antecipação, não o prazo:

```
entrada = U×(1−txCrédito) + V×(1−txDébito) + X×(1−txPix)
```

**Média por dia da semana.** Para cada unidade, a média das últimas 8
ocorrências daquele dia da semana. Dias com faturamento total zero são
ignorados, porque significam unidade fechada e puxariam a média para baixo.
Dias em que as modalidades não somam o total também saem do cálculo.

**Dia lançado x dia projetado.** Sempre que existe faturamento na planilha
para aquele dia e unidade, o painel usa o valor real. A média por dia da
semana só entra nos dias que ainda não fecharam. É isso que permite abrir o
período a partir de uma data passada e ver o realizado, com a projeção
começando exatamente onde a planilha para. No gráfico, o realizado aparece
sólido e a projeção hachurada, com uma divisória entre os dois.

**Período.** Os botões de 7 dias, 15 dias e fim do mês contam a partir da
data escolhida no campo "A partir de", que começa em hoje. Escolhendo 06/09 e
7 dias, o período vai de 06/09 a 12/09.

**Saldo acumulado dia a dia**, e não só no total do período:

```
Saldo(d) = Saldo(d−1) + Média(unidade, diaDaSemana) − ContasVencendoEm(d)
```

O acumulado diário é o ponto principal. Um período pode fechar positivo e
ainda assim furar no meio do caminho, se as contas vencem antes das entradas
chegarem. O painel mostra em que dia isso acontece e quanto falta.

**Comissão.** Toda segunda entra a comissão da **semana fechada anterior**,
de segunda a domingo. Para o pagamento de 07/09, a base são os dias 31/08 a
06/09. O cálculo usa o faturamento bruto lançado na planilha, incluindo o
dinheiro em espécie, já que o barbeiro ganha sobre tudo que atende. Os dias
daquela semana que ainda não foram lançados caem na média do dia da semana, e
a tela mostra quantos dos sete dias já são reais.

Uma parte da comissão é paga à vista e não passa pela conta bancária: sai do
dinheiro em espécie que entra no caixa. Essa fatia é configurável e aparece
na tela riscada, para deixar claro que existe mas não afeta o saldo. Ela é
limitada pelo dinheiro que a projeção estima receber na semana. Se o
percentual configurado pedir mais espécie do que deve entrar, a diferença é
lançada como saída da conta e o painel avisa.

**Insumos.** Toda terça entra o valor médio semanal da unidade, lido da
coluna E da ContaStone.

Comissão e insumos são **projeções**, não contas lançadas na planilha. Na
tela aparecem com fundo hachurado e a palavra projeção, separadas das contas
fixas, e o resumo abaixo da tabela mostra os três blocos somados em separado.

**Contas consideradas.** Só as que estão sem Data de Pagamento na coluna F.
As que já venceram e continuam em aberto não entram na linha do tempo: vão
para o bloco de Pendências.

As pendências são separadas em abas por mês de vencimento, e o mês corrente
abre selecionado. O total do cabeçalho segue a aba aberta, não a soma de
tudo. O motivo é prático: pendência de um ano atrás quase sempre é baixa que
não foi dada na planilha, e somada ao que venceu esta semana ela inflaria o
número que serve para decidir pagamento. Quando existem meses anteriores com
saldo, o painel avisa quanto há fora do total e sugere conferir se são
dívidas mesmo.

---

## Alertas

- Caixa não cobre o período: mostra o dia em que fura, o valor que falta e as contas daquele dia
- Saldo abaixo da reserva mínima configurada
- Saldo não atualizado há mais dias que o limite configurado
- Conta vencendo em até 3 dias sem boleto disponibilizado
- Dias em que as modalidades não somam o total do faturamento
- Unidade presente no faturamento ou nas contas mas ausente da ContaStone
- Taxas da maquininha zeradas, o que deixa a projeção otimista

---

## Telas

| Rota | O que faz |
|---|---|
| `/hoje` | Painel executivo: o veredito do período em uma frase, depois os números. Só dono e gestora |
| `/` | Consolidado da rede, unidades ordenadas por risco |
| `/unidade/[nome]` | Linha do tempo dia a dia, contas por dia, pendências |
| `/contas` | Contas a pagar com filtro por unidade e busca |
| `/saldos` | Onde a gestora atualiza o saldo de cada unidade |
| `/juridico` | **Esboço.** Documentos da unidade e contratos dos profissionais |
| `/equipe` | **Esboço.** Ranking e desempenho por profissional |
| `/config` | Taxas, comissão, janela da média, reserva mínima |

Ajustes saiu da barra inferior e virou um link no topo, ao lado de Sair, para
os cinco itens principais caberem na tela do celular. Só aparece para quem
tem perfil de edição.

---

## Controle de agendamento das contas

A coluna **I** da `BContasFixas`, "Controle de Status", diz em que pé está o
pagamento. O texto é livre, então o painel classifica por palavra-chave e não
por valor exato: uma grafia nova não quebra a tela, cai em "Outro" e aparece
com o texto original.

| Grupo | Reconhece | Significa |
|---|---|---|
| Aguardando aprovação | `Agendado (Aguard. …)`, qualquer "aguard" ou "pendente" | A gestora agendou e espera o aval |
| Sem status | célula vazia | Ninguém preencheu |
| Agendado e confirmado | `Agendado (Confirmado …)`, ou só "Agendado" | Agendamento feito |
| Aprovado | qualquer "aprovad" | Já resolvido |
| Outro | o resto | Aparece com o texto original |

Na tela de Contas os grupos viram botões com quantidade e valor, que também
filtram a lista. Cada linha ganha uma barra colorida do lado e mostra o texto
original do status.

O painel **não edita** esse campo. Contas sem status aparecem em vermelho com
o aviso de que a correção é manual, na planilha.

---

## Painel executivo

Rota `/hoje`, visível só para perfis de edição.

Abre com o **veredito em palavras**, em corpo grande, antes de qualquer
número: "O caixa cobre tudo no período" ou "3 unidades não fecham o período",
seguido do valor que falta e da data da primeira falha. A decisão vem antes
da tabela, porque quem abre essa tela tem trinta segundos.

Depois, nesta ordem: unidades sem caixa, contas a pagar separadas por status
de agendamento, vencidas em aberto, faturamento da rede com a variação, três
números da equipe e a lista completa de unidades com barra de proporção.

---

## Painel executivo: as dez seções

Rota `/hoje`, para dono e gestora. Cada seção responde uma pergunta de
negócio, e o título é a pergunta.

| # | Pergunta |
|---|---|
| 00 | Como leio este painel? |
| 01 | Como foi o período? |
| 02 | O que eu faço agora? |
| 03 | A tendência é de alta ou de queda? |
| 04 | Que semana foi melhor, de verdade? |
| 05 | O que vende e o que sobra? |
| 06 | Quem produz mais, comparado com justiça? |
| 07 | Onde edito o que está errado? |
| 08 | Qual unidade está fora da curva? |
| 09 | Se eu só ler uma coisa, o que é? |
| 10 | O que significa cada termo? |

Antes de tudo vem o veredito em uma frase: "O caixa cobre tudo no período"
ou "3 unidades não fecham o período", com o valor que falta e a data da
primeira falha.

### Honestidade dos números

Quatro regras que valem no painel inteiro:

**Nada vira alerta sem passar no teste.** A comparação entre dois períodos
roda teste t de Welch nos valores diários, e teste z para proporções. Abaixo
de p 0,05 o KPI mostra a variação em cinza, escrita "variação normal", e
nenhum cartão de alerta é gerado. Com 18 unidades comparadas toda semana,
sem isso alguma sempre varia por acaso e o painel vira alarme falso.

**A janela termina no último dia lançado**, não em hoje. Comparar contra dias
que a planilha ainda não recebeu faria o período atual parecer sempre pior.

**Semanas e meses comparam média diária**, não total. Semana com 4 dias
lançados contra uma de 7 teria total menor mesmo rendendo igual. Semana em
aberto aparece esmaecida e fica fora da média de referência.

**Barbeiro é comparado descontando o mix.** O esperado é quanto a pessoa
faturaria fazendo os mesmos serviços ao preço médio da rede, e o índice é o
observado dividido por esse esperado. Quem só faz corte não é punido contra
quem pega química. Menos de 30 atendimentos no período sai do ranking e
aparece esmaecido, com o motivo escrito.

### Seção 02, decisões

De 3 a 5 cartões numerados, ordenados pelo tamanho do impacto em reais. Cada
um tem o tamanho, o alcance, o dono, a confiança e, no rodapé, a prova em 60
dias: o indicador que precisa se mover se a decisão estiver certa.

As regras que geram decisão: caixa que não fecha, agendamento parado
esperando aprovação, vencidas em aberto, conta sem Controle de Status,
documento vencido, comissão acima do configurado, contrato cobrado sem
retorno e nota fiscal do mês.

### O que ficou de fora, e por quê

Clientes únicos, taxa de retorno, tempo entre visitas, clientes em risco,
ocupação de agenda, no-show e mapa dia por hora **não existem**. A planilha
não tem identificador de cliente nem horário de atendimento: a coluna G do
Faturamento conta pessoas por dia, não identifica quem são, e a aba Comissões
tem data mas não hora.

Para essas seções existirem, é preciso uma exportação com uma linha por
atendimento contendo cliente e horário.

---

## Temas e cores

As cores são variáveis CSS em `globals.css`, com tema claro, tema escuro por
preferência do sistema e um botão que grava a escolha.

A paleta é a do briefing, azul, laranja e verde, mas os tons do tema claro
foram escurecidos até passarem em 4,5:1 de contraste sobre a superfície.
O amarelo original ficava em 2,24:1, ilegível como texto. Os tons vivos
continuam existindo em `--s1-graf`, `--s2-graf` e `--s3-graf`, usados só em
preenchimento de gráfico, onde o alvo é 3:1.

Contraste medido no tema claro: ink 16,97 · ink2 8,78 · muted 5,05 · s1 6,20
· s2 4,77 · s3 4,70 · crit 5,47 · good 5,18 · warn 5,23. No escuro, o menor é
4,97.

## Prévia de design

A rota `/previa` renderiza o painel inteiro nos dois temas com dados
sintéticos, passando pelo mesmo motor de produção. Serve para trabalhar o
visual sem depender da planilha. Ela fica fora do login, então **remova a
rota antes de publicar** se não quiser que fique acessível.

---

## Comparativo e insights

Cada unidade traz a comparação entre os **últimos 28 dias lançados** e os 28
imediatamente anteriores: faturamento, atendimentos e ticket médio, cada um
com a variação percentual.

A janela termina no último dia que a planilha recebeu, e não em hoje.
Comparar contra dias ainda não lançados faria o período atual parecer sempre
pior do que é.

O ticket médio e o número de atendimentos vêm das colunas **G** (Nº Clientes)
e **H** (Qtde Atendimentos com pagamento) da aba Faturamento.

A partir dessa comparação o painel escreve observações em linguagem direta,
cada uma com o que fazer a respeito:

| Observação | Dispara quando |
|---|---|
| Faturamento subiu ou caiu | variação de 5% ou mais |
| Mais atendimentos, menos dinheiro | volume sobe e receita cai, sinal de desconto |
| Ticket médio subiu ou caiu | variação de 5% ou mais |
| Fatia alta em dinheiro | espécie passa de 25% do faturamento |
| Dia fraco da semana | o pior dia rende menos da metade do melhor |
| Fôlego de caixa | o saldo cobre menos de 15 dias de saída |
| Concentração de vencimento | mais da metade das contas vence num dia só |
| Comissão pesada | comissão passa de 15% acima do percentual configurado |

---

## Telas em desenvolvimento

Jurídico e Equipe já estão navegáveis, mas com **dados fictícios**. Servem
para fechar o formato antes de mexer na planilha. As duas mostram um aviso no
topo e a lista do que falta.

### Aba `Acessos`: controle por aba

A coluna **F**, chamada `Abas`, limita quais telas cada pessoa abre. Vazia,
vale o padrão do perfil. Com valores, só aqueles, separados por vírgula:

`hoje, caixa, contas, saldos, juridico, equipe, ajustes`

| Perfil | Padrão quando a coluna F está vazia |
|---|---|
| dono | todas |
| gestora | todas |
| gerente | caixa, contas, saldos, juridico, equipe |

A coluna nunca amplia além do perfil: colocar `ajustes` para um gerente não
libera nada, porque o perfil dele não tem essa aba. Para reduzir, funciona:
um gerente com `caixa, contas` só vê essas duas.

O bloqueio acontece em três camadas. A barra de navegação esconde o que a
pessoa não tem, o middleware redireciona quem digita a URL na mão, e as rotas
de API refazem a checagem contra a planilha.

---

### Jurídico

A tela é dividida em três painéis, em vez de uma lista só:

**Contratos** abre com o percentual de assinados entre os ativos e agrupa as
pessoas por situação, do pior caso para o melhor: cobrados sem retorno, sem
contrato, assinados sem data, em dia. Os três primeiros grupos abrem
expandidos; "em dia" fica recolhido, porque não pede ação.

**Notas fiscais** tem o seletor de mês, o percentual de entrega e duas
listas, pendentes e entregues, com um clique para marcar.

**Documentos** lista alvará, AVCB, licença sanitária e contrato de locação,
ordenados por urgência, com o custo de renovação do que está vencido ou perto
de vencer somado no topo.

### Como os dados de profissionais são lidos

Lê a aba **`Profissionais`**. As colunas são localizadas **pelo nome no
cabeçalho da linha 1**, não por letra fixa, então inserir ou mover coluna não
quebra nada. Os nomes procurados:

`Unidade Corrigida` (com `Unidade` como reserva), `Nome completo`, `Apelido`,
`Função`, `Forma relação profissional`, `Status`, `Data Inicio`, `Contrato`,
`Data Contrato`, `Pasta Parceiro`, `obs` e as doze `NF | JAN` … `NF | DEZ`.

O que a tela faz:

- Filtro por unidade, com o **percentual de contratos assinados** entre os
  ativos e o percentual de NF entregue no mês escolhido
- Seletor de mês para a nota fiscal, começando no mês corrente
- Botão "Só pendentes", que deixa na lista quem está sem contrato ou sem NF
- Clique alterna `VERDADEIRO` e `FALSO` direto na planilha
- Quem tem `Status` igual a `Inativo` fica fora das contagens
- A coluna `obs` aparece abaixo do nome, que é onde costuma estar a
  explicação de quem está com contrato `FALSO`

**Regra do contrato:** clicar não grava nada. O botão "Editar contrato e
pasta" abre um painel com a marcação de contrato e o campo do link do Drive,
e só o Salvar escreve na planilha. O link pode ser adicionado ou trocado a
qualquer momento, e marcar contrato como assinado exige que ele esteja
preenchido: contrato sem arquivo guardado não comprova nada depois.

**Situação do contrato.** São quatro, e a diferença entre as duas piores
importa:

| Situação | Quando |
|---|---|
| Contrato assinado | `Contrato` verdadeiro e com `Data Contrato` |
| Assinado, sem data | verdadeiro mas sem a data preenchida |
| **Solicitado, sem retorno** | sem contrato e a `obs` menciona solicitação, envio ou cobrança |
| Sem contrato | sem contrato e sem nada registrado na obs |

"Solicitado, sem retorno" ganha destaque próprio, porque significa que já se
foi atrás e não voltou. A lista sobe os pendentes para o topo, com esses
primeiro.

**Coluna `Atualização`.** Crie uma coluna com esse nome na aba
`Profissionais`. Toda alteração feita pelo painel carimba a data nela, e a
tela mostra "atualizado em" junto de cada pessoa. Sem a coluna o painel
continua funcionando, mas avisa que o registro não está sendo guardado.

**Escopo e permissão.** Dono e gestora veem todas as unidades e editam.
Gerente vê só as unidades da coluna D da aba `Acessos` e não edita. O corte
acontece no servidor, então quem tem escopo limitado não recebe as outras
unidades nem no JSON.

### Documentos da unidade

Lê a aba **`DocumentosUnidade`**, também por nome de cabeçalho: `unidade`
(ou `Unidade Corrigida`), `documento`, `órgão`, `número`, `emissão`,
`Vencimento`, `Alerta (dias)`, `Protocolo renovação`, `Custo renovação`,
`Responsável`, `Arquivo` e `Obs`.

A situação sai da comparação entre o vencimento e a coluna de alerta, que é
por documento e não geral: 60 dias para o alvará sanitário e 180 para a
licença ambiental funcionam lado a lado.

| Situação | Quando |
|---|---|
| Vencido | a data já passou |
| Vence em breve | faltam menos dias que o alerta daquele documento |
| Vigente | ainda fora da janela de alerta |
| Sem vencimento | a data está vazia |

Documentos vencidos sobem para o topo e geram alerta próprio. O custo de
renovação dos vencidos e dos em alerta é somado, para dar a conta do que vai
sair de caixa com renovação.

---

### Comissões reais

A aba **`Comissões`** traz um lançamento por atendimento, com
`Atendimento/Venda`, `Profissional`, `Serviço/Produto/Pacote`, `Valor`,
`Valor Comissão`, `Vol` e `%Comissão`.

Ela muda a projeção: **quando existe comissão apurada para a semana fechada,
o painel usa a soma de `Valor Comissão` em vez do percentual sobre o
faturamento.** O percentual continua valendo só enquanto a semana não fechou.
A divisão entre o que sai da conta e o que é pago em espécie continua
seguindo o percentual configurado em Ajustes, com o mesmo teto do dinheiro
disponível.

A tela mostra se o valor daquela segunda é apurado ou projetado, e quantos
dias já foram lançados.

A mesma aba alimenta a tela **Equipe**: ranking por profissional, ticket
médio, percentual de comissão, mix de serviços e comparação com o período
anterior de mesmo tamanho.

---

## Nomes de unidade: o ponto que mais quebra

As abas novas vieram com grafias diferentes da mesma unidade:
`The Barber Express Boa Vista`, `The Barber Express Boavista SP` e
`THE BARBER BOA VISTA 2`.

Todas as abas precisam de uma coluna com o **mesmo nome padronizado** usado
em `ContaStone!A`. O painel procura primeiro por `Unidade Corrigida` e só cai
para `Unidade` se não achar.

Quando um nome não bate, o registro simplesmente não aparece, sem erro. Se
uma unidade sumir de alguma tela, é quase sempre isso.

**Sobre privacidade:** a aba tem CPF, telefone e data de nascimento. A tela
hoje não exibe nenhum dos três, só nome, unidade, função e relação. Se algum
deles for necessário na tela, vale mascarar e restringir a perfis de edição.

### Equipe

Depende de um dado que a planilha ainda não tem: o faturamento aberto por
profissional. A aba `Faturamento` é por unidade e por dia, sem a coluna de
quem atendeu.

Sugestão de aba **`FaturamentoProfissional`**, uma linha por atendimento:

```
Data · Unidade · Profissional · Serviço · Valor · Forma de pagamento · Cliente · Duração
```

Com a coluna Cliente vem a taxa de retorno e a fidelização. Com Duração vem a
ocupação real da agenda. Sem elas o ranking fica limitado a faturamento,
atendimentos e ticket médio, o que já serve, mas mostra bem menos.

Se o sistema da barbearia exporta esses dados, o melhor caminho é jogar a
exportação numa aba e o painel ler de lá, do mesmo jeito que já acontece com
o faturamento diário. Digitar à mão não se sustenta com 18 unidades.

---

## Estrutura

```
src/
  app/
    page.tsx                 painel da rede
    unidade/[slug]/page.tsx  detalhe da unidade
    contas/page.tsx          contas a pagar
    saldos/page.tsx          edição dos saldos
    config/page.tsx          ajustes
    api/projecao/route.ts    lê a planilha e devolve a projeção pronta
    api/saldos/route.ts      lê e grava ContaStone
    api/config/route.ts      lê e grava AppConfig
  lib/
    sheets.ts                acesso à planilha, mapa das colunas, cache
    projecao.ts              motor de cálculo
    parse.ts                 conversão de moeda, datas e dias da semana
    types.ts
  components/
```

O cache fica em memória: faturamento 10 minutos, contas 2 minutos, saldos 30
segundos. Depois de gravar um saldo o cache é limpo na hora, então a tela já
mostra o valor novo.

---

## Publicar

O projeto roda em qualquer host que suporte Next.js. Na Vercel ou Netlify,
importe o repositório e cadastre as três variáveis de ambiente em
Environment Variables. Não suba o `.env.local` para o Git: a chave privada dá
acesso de escrita à planilha.

---

## Antes de colocar em produção

1. Preencher as taxas reais da Stone em Ajustes. Enquanto estiverem zeradas, a projeção usa o valor bruto e fica otimista
2. Criar as colunas C e D na aba ContaStone
3. Conferir se os 18 nomes batem exatamente entre `Faturamento!AB`, `BContasFixas!P` e `ContaStone!A`
4. Definir a reserva mínima
7. Criar a aba `Acessos` e cadastrar uma linha por pessoa, com código próprio
8. Definir o `APP_SECRET` no ambiente (`openssl rand -hex 32`)
