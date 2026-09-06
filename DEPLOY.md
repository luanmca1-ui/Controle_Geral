# Publicar na Vercel

## 1. Suba o código para o GitHub

```bash
git init
git add .
git commit -m "Painel de caixa"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/barber-caixa.git
git push -u origin main
```

O `.gitignore` já bloqueia o `.env.local`. Confira antes do push: a chave
privada dá acesso de escrita à planilha, e uma vez publicada num repositório
ela precisa ser revogada e gerada de novo.

## 2. Importe na Vercel

Em vercel.com, **Add New > Project**, escolha o repositório e importe. O
framework é detectado sozinho, não mexa nas configurações de build.

## 3. Cadastre as variáveis de ambiente

Em **Settings > Environment Variables**, marcando Production, Preview e
Development em todas:

| Nome | Valor |
|---|---|
| `SPREADSHEET_ID` | o mesmo do `.env.local` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | o mesmo do `.env.local` |
| `GOOGLE_PRIVATE_KEY` | a chave inteira |
| `APP_SECRET` | gere com `openssl rand -hex 32` |

Sobre a `GOOGLE_PRIVATE_KEY`: cole o valor exatamente como está no
`.env.local`, com os `\n` literais. O código converte na hora de usar. Se
você colar a chave em várias linhas de verdade também funciona, mas as aspas
não devem ir junto no painel da Vercel.

Se `APP_SECRET` faltar, o painel devolve erro em vez de abrir sem proteção.
Os códigos de acesso das pessoas não ficam aqui: ficam na aba `Acessos` da
planilha, e podem ser criados ou revogados sem redeploy.

## 4. Região

Em **Settings > Functions**, coloque a região em **São Paulo (gru1)**. As
funções ficam perto de quem usa, e não do datacenter padrão nos Estados
Unidos. A planilha continua sendo lida do Google, mas a viagem até o celular
encurta bastante.

## 5. Deploy

Cada push na `main` publica sozinho. Para trocar a senha depois, basta
alterar `APP_SENHA` e fazer um redeploy.

## 6. Instalar no celular

Abra a URL no celular e escolha Adicionar à Tela de Início. No iPhone é pelo
botão de compartilhar do Safari, no Android o Chrome oferece direto. O painel
passa a abrir como aplicativo, sem barra de navegador.

---

## Sobre o acesso

Cada pessoa entra com o próprio código, cadastrado na aba `Acessos`. Veja o
README para a estrutura da aba e os perfis.

Para tirar alguém do ar, escreva `Não` na coluna Ativo ou apague a linha. O
corte vale em até um minuto, que é o tempo do cache. Não precisa de redeploy
nem trocar código de ninguém.

Trocar o `APP_SECRET` derruba todas as sessões de uma vez. É o botão de
emergência, se você suspeitar que algum código vazou.
