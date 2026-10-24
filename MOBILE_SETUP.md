# SnapGain Mobile (iOS e Android) — Capacitor

Este projeto foi configurado com [Capacitor](https://capacitorjs.com) para gerar
aplicativos nativos iOS e Android **sem alterar o aplicativo web**. O mesmo código
React/Vite que roda em https://snapgain.uk é empacotado dentro do app.

## O que foi adicionado (nada do app web foi modificado)

| Item | Descrição |
|---|---|
| `capacitor.config.json` | Configuração do Capacitor (appId `uk.snapgain.app`, webDir `dist`) |
| `android/` | Projeto Android nativo (abrir no Android Studio) |
| `ios/` | Projeto iOS nativo (abrir no Xcode, requer macOS) |
| `package.json` | Dependências `@capacitor/*` e scripts `mobile:*` (o build web continua idêntico) |

Os arquivos do app web (`src/`, `index.html`, `vite.config.js`, `public/`, etc.)
**não foram tocados**. O site continua funcionando exatamente como antes.

## Fluxo de trabalho

Sempre que o código web mudar, rode:

```bash
npm run mobile:sync        # build web + copia para android/ e ios/
```

### Android

Requisitos: [Android Studio](https://developer.android.com/studio) + JDK 21.

```bash
npm run mobile:android     # build + sync + abre no Android Studio
```

No Android Studio: **Run** para testar num emulador/dispositivo, ou
**Build > Generate Signed App Bundle** para gerar o `.aab` de publicação na
Google Play (conta Play Console: US$ 25, taxa única).

### iOS

Requisitos: macOS + [Xcode](https://developer.apple.com/xcode/) + CocoaPods não é
necessário (o projeto usa Swift Package Manager).

```bash
npm run mobile:ios         # build + sync + abre no Xcode
```

No Xcode: selecione seu time de desenvolvimento em **Signing & Capabilities**,
depois **Run** para testar. Para publicar na App Store é necessária a conta
Apple Developer (US$ 99/ano).

## Pontos de atenção antes de publicar

1. **Stripe / compras in-app**: se o app vender funcionalidades digitais
   (assinaturas, créditos), Apple e Google exigem os sistemas de compra deles
   (StoreKit / Google Play Billing) em vez do checkout Stripe dentro do app.
   O Stripe pode continuar sendo usado na versão web.
2. **OAuth (Supabase Auth)**: o redirect de login social precisa de um deep link
   (ex.: `uk.snapgain.app://callback`) registrado no Supabase e nos projetos
   nativos. Veja: https://supabase.com/docs/guides/auth/native-mobile-deep-linking
3. **hCaptcha**: funciona na WebView, mas teste o fluxo de cadastro no
   dispositivo; pode ser necessário liberar o domínio no painel do hCaptcha.
4. **Ícones e splash screen**: gere com `npx @capacitor/assets generate`
   a partir de um `icon.png` (1024×1024) e `splash.png` (2732×2732) em `assets/`.

## Comandos úteis

```bash
npx cap sync               # copia o build web para os projetos nativos
npx cap open android       # abre o projeto no Android Studio
npx cap open ios           # abre o projeto no Xcode
npx cap doctor             # diagnostica o ambiente
```
