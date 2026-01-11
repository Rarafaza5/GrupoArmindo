# 🚀 Armindo Forms - Configuração e Deploy

## Sobre

Armindo Forms é uma plataforma de formulários premium para o Grupo Armindo, construída com HTML, CSS e JavaScript puro, utilizando Firebase como backend (Authentication + Firestore).

![Grupo Armindo Logo](Grupo_armindo_logo_colorida_fundo_trasparente.png)

## ✨ Funcionalidades

- 📝 **15+ Tipos de Perguntas**: Texto, escolha múltipla, rating, NPS, escala, data, upload, etc.
- 🎨 **Design Premium**: Interface moderna com glassmorphism, animações e tema escuro
- 🔀 **Drag & Drop**: Editor intuitivo para criar formulários
- 🧠 **Lógica Condicional**: Mostrar/esconder perguntas baseado em respostas
- 📊 **Analytics Avançados**: Gráficos, estatísticas e exportação CSV
- 🔒 **Seguro**: Autenticação com Google ou Email/Password
- 📱 **Responsivo**: Funciona em qualquer dispositivo
- 💰 **Gratuito**: Usa o plano gratuito do Firebase

## 📁 Estrutura de Ficheiros

```
forms/
├── index.html              # Landing page
├── dashboard.html          # Painel do criador
├── editor.html             # Editor de formulários
├── form.html               # Página pública de resposta
├── analytics.html          # Visualização de respostas
├── css/
│   ├── main.css           # Design system global
│   ├── dashboard.css      # Estilos do dashboard
│   ├── editor.css         # Estilos do editor
│   └── form.css           # Estilos do form público
├── js/
│   ├── firebase-config.js # Configuração Firebase
│   ├── dashboard.js       # Lógica do dashboard
│   ├── editor.js          # Lógica do editor
│   ├── form.js            # Lógica de resposta
│   └── analytics.js       # Gráficos e estatísticas
└── README.md              # Este ficheiro
```

## 🔧 Configuração do Firebase

### Passo 1: Criar Projeto Firebase

1. Aceda a [Firebase Console](https://console.firebase.google.com/)
2. Clique em **Adicionar projeto**
3. Dê um nome ao projeto (ex: "armindo-forms")
4. Siga os passos (pode desativar o Google Analytics se quiser)
5. Clique em **Criar projeto**

### Passo 2: Ativar Authentication

1. No menu lateral, clique em **Build > Authentication**
2. Clique em **Get started**
3. No separador **Sign-in method**, ative:
   - **Email/Password** (clique, ative e guarde)
   - **Google** (clique, ative, selecione o email de suporte e guarde)

### Passo 3: Criar Base de Dados Firestore

1. No menu lateral, clique em **Build > Firestore Database**
2. Clique em **Create database**
3. Escolha **Start in production mode**
4. Selecione a região mais próxima (ex: `europe-west1` para Portugal)
5. Clique em **Enable**

### Passo 4: Configurar Regras de Segurança do Firestore

1. No Firestore, clique no separador **Rules**
2. Substitua o conteúdo pelas seguintes regras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Forms collection
    match /forms/{formId} {
      // Anyone can read active forms
      allow read: if resource.data.status == 'active' || 
                     request.auth != null && request.auth.uid == resource.data.creatorId;
      
      // Only authenticated users can create forms
      allow create: if request.auth != null && 
                       request.resource.data.creatorId == request.auth.uid;
      
      // Only the creator can update/delete
      allow update, delete: if request.auth != null && 
                              request.auth.uid == resource.data.creatorId;
    }
    
    // Responses collection
    match /responses/{responseId} {
      // Anyone can create responses to active forms
      allow create: if true;
      
      // Only form creator can read responses
      allow read: if request.auth != null && 
                    get(/databases/$(database)/documents/forms/$(resource.data.formId)).data.creatorId == request.auth.uid;
      
      // Only form creator can delete responses
      allow delete: if request.auth != null && 
                      get(/databases/$(database)/documents/forms/$(resource.data.formId)).data.creatorId == request.auth.uid;
    }
    
    // Templates collection (read-only)
    match /templates/{templateId} {
      allow read: if true;
    }
  }
}
```

3. Clique em **Publish**

### Passo 5: Obter Credenciais do Firebase

1. Clique no ícone de engrenagem ⚙️ ao lado de **Project Overview**
2. Selecione **Project settings**
3. Role até **Your apps** e clique em **Web** (ícone `</>`)
4. Dê um nome (ex: "Armindo Forms Web")
5. **Não** marque "Firebase Hosting" (vamos usar GitHub Pages)
6. Clique em **Register app**
7. Copie o conteúdo do objeto `firebaseConfig`

### Passo 6: Atualizar o Ficheiro de Configuração

1. Abra o ficheiro `js/firebase-config.js`
2. Substitua as credenciais de exemplo pelas suas:

```javascript
const firebaseConfig = {
    apiKey: "A SUA API KEY",
    authDomain: "SEU-PROJETO.firebaseapp.com",
    projectId: "SEU-PROJETO",
    storageBucket: "SEU-PROJETO.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

## 🚀 Deploy no GitHub Pages

### Passo 1: Criar Repositório

1. Crie um novo repositório no GitHub
2. Faça upload de todos os ficheiros da pasta `forms/`

### Passo 2: Ativar GitHub Pages

1. Vá a **Settings > Pages**
2. Em **Source**, selecione **Deploy from a branch**
3. Em **Branch**, selecione `main` e `/ (root)`
4. Clique em **Save**

### Passo 3: Configurar Domínio (Opcional)

Se quiser usar um subdomínio de `grupoarmindo.site`:

1. Adicione um ficheiro `CNAME` com o conteúdo:
   ```
   forms.grupoarmindo.site
   ```

2. No DNS do seu domínio, adicione um registo CNAME:
   - **Nome**: `forms`
   - **Valor**: `SEU-USERNAME.github.io`

### Passo 4: Atualizar Domínio no Firebase

1. No Firebase Console, vá a **Authentication > Settings > Authorized domains**
2. Clique em **Add domain**
3. Adicione o seu domínio (ex: `forms.grupoarmindo.site` ou `seu-username.github.io`)

## 📖 Como Usar

### Criar um Formulário

1. Aceda ao site e faça login
2. Clique em **Criar Formulário**
3. Adicione perguntas arrastando do painel esquerdo
4. Configure cada pergunta no painel direito
5. Clique em **Publicar** quando terminar

### Partilhar um Formulário

1. Após publicar, copie o link fornecido
2. Partilhe via WhatsApp, Email ou redes sociais
3. Ou embeba no seu site usando o código iframe

### Ver Respostas

1. No Dashboard, clique no ícone 📊 do formulário
2. Veja estatísticas, gráficos e respostas individuais
3. Exporte para CSV se necessário

## 🔒 Limites do Plano Gratuito do Firebase

O plano **Spark** (gratuito) inclui:

| Recurso | Limite |
|---------|--------|
| Firestore Reads | 50,000/dia |
| Firestore Writes | 20,000/dia |
| Firestore Storage | 1 GB |
| Authentication | Ilimitado |
| Bandwidth | 10 GB/mês |

Para a maioria dos casos de uso, estes limites são mais que suficientes!

## 🐛 Resolução de Problemas

### "Permission denied" ao criar formulário
- Verifique se as regras do Firestore estão corretas
- Confirme que está autenticado

### Formulário não aparece publicamente
- Verifique se o status é "active"
- Confirme que não há restrições de data

### Erro de autenticação com Google
- Verifique se o domínio está autorizado no Firebase
- Confirme que o Google Sign-In está ativado

## 📞 Suporte

Para suporte, contacte o Grupo Armindo através de [grupoarmindo.site](https://grupoarmindo.site)

---

**Desenvolvido com ❤️ para o Grupo Armindo**
