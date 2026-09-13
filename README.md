# PhraseTyping

**使えるフレーズを、タイプして丸ごと身につける。**

PhraseTypingは、練習したい場面に合わせてAIが英会話を作成し、会話の流れに沿って英文をタイピングできる学習アプリです。

## Demo

[PhraseTypingを使ってみる](https://phrase-typing-kohl.vercel.app/)

## 主な機能

- 入力した状況と難易度に合わせた英会話の生成
- 使ってほしい単語・熟語・定型表現の任意指定
- 入力表現に誤りがある場合の修正候補表示
- 会話形式で進む英文タイピング
- 各英文の日本語訳の表示・非表示
- シチュエーションに合った重要表現のハイライトと解説
- タイピング時間・正確性・速度・スコアの計測
- 作成したROOMとプレイ結果のブラウザ保存
- ROOM一覧からの再プレイ

## 使い方

1. 練習したい場面を日本語で入力します。
2. `Easy`、`Normal`、`Hard`から難易度を選びます。
3. 必要に応じて、会話に含めたい英単語や表現を入力します。
4. `TYPE ROOM作成`を押すと、AIが英会話を生成します。
5. 表示された英文を順番にタイピングします。
6. 終了後、スコアと今回の重要表現を確認できます。

## データ保存について

作成したROOMとプレイ結果は、ブラウザの`localStorage`に保存されます。アカウントやデータベースは使用していないため、別の端末やブラウザにはデータが引き継がれません。

## 技術構成

- Next.js 16（App Router）
- React 19
- TypeScript
- CSS Modules / CSS
- Gemini API
- Vercel

## ローカルでの起動

### 1. リポジトリを取得

```bash
git clone https://github.com/HamstarCode/PhraseTyping.git
cd PhraseTyping
npm install
```

### 2. APIキーを設定

プロジェクト直下に`.env.local`を作成し、Google AI Studioで発行したGemini APIキーを設定します。

```env
GEMINI_API_KEY=your_api_key_here
```

`.env.local`はGitの管理対象外です。APIキーをGitHubへ登録しないでください。

### 3. 開発サーバーを起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)をブラウザで開きます。

## 確認用コマンド

```bash
npm run lint
npx tsc --noEmit
npm run build
```
