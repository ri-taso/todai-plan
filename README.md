# 合格戦略プランナー

スマホ前提の受験戦略アプリです。PWA として GitHub Pages へ配布でき、同じ UI を Capacitor で Android アプリとして包めます。

## できること

- スマホ表示に最適化された受験戦略ダッシュボード
- ローカル保存される学習タイマーと当日ログ
- 大学・学部ごとに差し替えやすいプロフィール設定
- API なしで AI に JSON を返させて、そのままアプリへ取り込む運用

## Web / PWA

```bash
npm install
npm run dev
```

本番ビルド:

```bash
npm run build
```

GitHub Pages へ反映:

```bash
npm run deploy
```

## Android アプリ化

初回セットアップ:

```bash
npm install
npm run cap:android
```

Android Studio で開く:

```bash
npm run cap:open:android
```

Web 側を更新した後に Android プロジェクトへ反映:

```bash
npm run cap:android
```

### 自分のスマホだけで使う場合

Play Store 提出は不要です。APK を直接作って端末へ入れられます。

デバッグ APK:

```bash
npm run apk:debug
```

生成先:

`android/app/build/outputs/apk/debug/app-debug.apk`

これはすぐ試せますが、開発用署名です。

### 手元配布用の release APK

1. `android/keystore.properties.example` を `android/keystore.properties` にコピー
2. `storeFile` の場所に keystore を置く
3. 各パスワードと alias を埋める
4. 次を実行

```bash
npm run cap:android
npm run apk:release
```

生成先:

`android/app/build/outputs/apk/release/app-release.apk`

`keystore.properties` と keystore 本体は Git に入れない前提です。

## iPhone について

このリポジトリは Capacitor 対応済みですが、iOS ビルドには macOS と Xcode が必要です。必要になれば `@capacitor/ios` を追加して同じ構成で展開できます。

## AI 取り込み運用

1. アプリの `AI取込` タブでプロンプトをコピー
2. 任意の AI に貼って JSON を返させる
3. 返ってきた JSON をそのまま貼り付けて取り込む

API を組まずに、大学別の情報を半手動でアプリへ流し込む想定です。
