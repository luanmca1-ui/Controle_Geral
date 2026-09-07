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

## Telas em desenvolvimento

Jurídico e Equipe já estão navegáveis, mas com **dados fictícios**. Servem
para fechar o formato antes de mexer na planilha. As duas mostram um aviso no
topo e a lista do que falta.

### Jurídico

Precisa de duas abas novas.

**`Profissionais`** — cole o que você já mantém no Excel, com as colunas de
Unidade, Nome completo, Apelido, Email, Telefones, CPF, Administrador, Possui
agenda, Data de nascimento, Status, Faz Lançamento PAT, Data Início, Forma
relação profissional, Função, obs, Contrato, Data Contrato, Pasta Parceiro e
as doze colunas de NF por mês.

A coluna Unidade precisa do nome padronizado, o mesmo das outras abas.

Três alertas que o painel já monta a partir dessas colunas: profissional sem
contrato assinado, contrato marcado como assinado mas com Data Contrato
vazia, e nota fiscal do mês pendente. O segundo caso aparece nos seus dados
de exemplo: duas das três linhas têm contrato `VERDADEIRO` sem data, e sem
ela não dá para saber quando renova.

**`DocumentosUnidade`** — unidade, documento, órgão emissor, número, data de
emissão, validade, link do arquivo e observação. Cobre alvará, AVCB, licença
sanitária, contrato de locação com o shopping, laudo elétrico e o que mais
aparecer.

Falta definir com quantos dias de antecedência cada tipo entra em alerta. O
alvará costuma pedir 60 dias; contrato de shopping, bem mais.

**Sobre privacidade:** essa aba tem CPF, telefone e data de nascimento. Hoje
qualquer código de acesso abriria a tela inteira. Antes de ligar nos dados
reais, vale restringir a aba a perfis de edição e mascarar o CPF na
listagem.

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
