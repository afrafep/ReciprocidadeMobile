# ReciprocidadeMobile

Front Next.js do fluxo de reciprocidade do plano de saude.

## Autenticacao

O navegador recebe `chavePasse` na URL e solicita uma sessao ao route handler do Next. Somente o
servidor Next conhece o token tecnico e a chave de funcionalidade. O backend Java consulta o Mosia,
valida o titular ativo no Oracle e devolve um JWT curto, armazenado em cookie `HttpOnly`.

As consultas de familia e solicitacoes nao recebem CPF como identidade. Os route handlers usam o
JWT do cookie no header `Authorization: Bearer`.

## Configuracao

Copie `.env.example` para `.env` e preencha:

```env
API_BASE_URL=http://localhost:8086/solicitacoes-mobile
RECIPROCIDADE_FRONT_TOKEN=substituir
RECIPROCIDADE_CHAVE_FUNCIONALIDADE=substituir
RECIPROCIDADE_DEV_AUTH_ENABLED=true
RECIPROCIDADE_DEV_CPF=00000000000
DEBUG=false
```

Todas essas variaveis sao server-side. Nao use prefixo `NEXT_PUBLIC_*` para credenciais, chave de
funcionalidade ou CPF de desenvolvimento.

## Teste local por CPF

Com o backend no profile `local` ou `dev` e `APP_DEV_AUTH_ENABLED=true`, defina
`RECIPROCIDADE_DEV_AUTH_ENABLED=true` e `RECIPROCIDADE_DEV_CPF` no front.
Nesse modo, o route handler chama `/api/auth/desenvolvimento/sessoes`; o Mosia e ignorado, mas o
CPF ainda precisa pertencer a um titular ativo no Oracle. Em producao, a variavel deve ficar ausente
e a `chavePasse` volta a ser obrigatoria.

Alteracoes de `.env` exigem reinicio do servidor Next.

## Console de diagnostico

`DEBUG=true` habilita um console visual no rodape com a `chavePasse`, endpoints do Next e Java,
payloads, status e corpos das respostas. O painel permite copiar todos os eventos e possui fallback
para WebViews sem acesso moderno ao clipboard. O token tecnico e o JWT nunca sao exibidos.

Use essa opcao somente temporariamente em teste. Como o console exibe dados funcionais e pessoais,
mantenha `DEBUG=false` em producao e realize um novo deploy depois de alterar a variavel.

## Rotas internas

- `POST /api/reciprocidade/sessao`: abre a sessao Mosia ou local.
- `DELETE /api/reciprocidade/sessao`: encerra o cookie local.
- `GET /api/reciprocidade/beneficiario`: consulta a familia autenticada.
- `GET|POST /api/reciprocidade/solicitacoes`: consulta ou cria solicitacoes autenticadas.
- `GET /api/reciprocidade/filiadas/ativas`: consulta tecnica das filiadas.

## Publicacao

O backend novo deve estar disponivel antes deste front. Depois da publicacao e verificacao, rotacione
qualquer token tecnico que tenha sido anteriormente exposto. Nunca publique o modo local em outro
profile nem habilite `APP_DEV_AUTH_ENABLED` fora do ambiente controlado.

Build, servidor e testes devem ser executados somente quando autorizados no fluxo do projeto.
