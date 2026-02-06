# Mandamentos de Joca (Firebase)

Dois sites:

- `index.html`: público (lista os mandamentos).
- `admin.html`: admin (login + adicionar/ativar/desativar/excluir).

## Como configurar (Firebase)

1) Crie um projeto no Firebase.
2) Ative:
   - Firestore Database
   - Authentication → Email/Password
3) Pegue as credenciais do Web App (Config do Firebase) e cole em:
   - `firebase-config.js` (objeto `firebaseConfig`)
4) No Firestore, crie o documento `config/admins` com:
   - campo `uids` (array de strings) com o UID do seu usuário admin.

   Dica: faça login em `admin.html`, copie o UID que aparece, e coloque na lista.
5) (Recomendado) Publique regras do Firestore usando `firestore.rules` para bloquear escrita de não-admin.

## Estrutura do Firestore

- Collection: `mandamentos`
  - `texto` (string)
  - `numero` (number, opcional)
  - `ativo` (boolean)
  - `criadoEm` (timestamp)
  - `criadoPor` (uid)

## Rodar local

Sirva os arquivos em um servidor local (evite abrir por `file://`):

- Com Node: `npx serve .`
- Ou com Python: `python -m http.server 8080`
