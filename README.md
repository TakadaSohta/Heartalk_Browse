# HearTalk

![HearTalk ロゴ](https://github.com/TakadaSohta/Heartalk_Browse/blob/main/images/icon2.png) <!-- 実際のロゴに置き換えてください -->

**HearTalk**は、ユーザーが心拍数データをリアルタイムで追跡し、プロフィールを管理し、友達とつながり、タイムリーな通知を受け取ることができるウェブアプリケーションです。最新のウェブ技術とFirebaseを活用し、シームレスでインタラクティブなユーザー体験を提供します。

## 目次

- [機能](#機能)
- [デモ](#デモ)
- [使用技術](#使用技術)
- [インストール](#インストール)
- [使用方法](#使用方法)
- [プロジェクト構成](#プロジェクト構成)
- [貢献方法](#貢献方法)
- [ライセンス](#ライセンス)
- [お問い合わせ](#お問い合わせ)
- [謝辞](#謝辞)

## 機能

- **ユーザー認証:** Firebase Authenticationを使用した安全なサインインおよびサインアウト。
- **プロフィール管理:** ユーザーはプロフィールを表示および編集でき、プロフィール画像のアップロードとクロップが可能。
- **リアルタイム心拍数モニタリング:** 動的なグラフでリアルタイムの心拍数データを表示および視覚化。
- **QRコード生成:** 友達との簡単な接続のためにユニークなQRコードを生成。
- **友達管理:** 許可された友達を追加、表示、検索して心拍数データを監視。
- **通知:** Firebase Cloud Messaging（FCM）を使用してリアルタイム通知を受信。
- **レスポンシブデザイン:** デスクトップとモバイルデバイスの両方に最適化。
- **アクセシビリティ:** ARIAラベルやキーボードナビゲーションサポートを含むアクセシビリティを考慮した設計。

## 使用技術

- **フロントエンド:**
  - HTML5
  - CSS3
  - JavaScript (ES6)
  - [Chart.js](https://www.chartjs.org/) - データ視覚化
  - [Cropper.js](https://github.com/fengyuanchen/cropperjs) - 画像クロップ
  - [QRCode.js](https://davidshimjs.github.io/qrcodejs/) - QRコード生成
  - [Font Awesome](https://fontawesome.com/) - アイコン

- **バックエンド & サービス:**
  - [Firebase](https://firebase.google.com/): Authentication、Realtime Database、Storage、Cloud Messaging

- **ビルドツール:**
  - [Webpack](https://webpack.js.org/) - モジュールバンドリング
  - [Babel](https://babeljs.io/) - JavaScriptトランスパイリング
  - [dotenv-webpack](https://github.com/mrsteele/dotenv-webpack) - 環境変数管理

## インストール

以下の手順に従って、HearTalkをローカル環境にセットアップして実行します。

### 必要条件

- [Node.js](https://nodejs.org/ja/download/) (v12以上)
- [npm](https://www.npmjs.com/get-npm) (Node.jsに付属)

### リポジトリをクローン

```bash
git clone https://github.com/yourusername/heartalk.git
cd heartalk
```

### 依存関係をインストール

```bash
npm install
```

### Firebaseの設定

1. [Firebase](https://firebase.google.com/)プロジェクトを作成。
2. 以下のFirebaseサービスを有効化:
   - **Authentication:** Email/Passwordおよびその他のサインイン方法を有効化。
   - **Realtime Database:** テストモードまたは本番モードでRealtime Databaseを設定。
   - **Storage:** プロフィール画像のアップロードのためにFirebase Storageを有効化。
   - **Cloud Messaging:** 通知のためにFirebase Cloud Messagingを設定。
3. FirebaseコンソールからFirebaseの設定詳細を取得。

### 環境変数の設定

プロジェクトのルートディレクトリに`.env`ファイルを作成し、Firebaseの設定を追加します。

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_DATABASE_URL=your_database_url
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> **注意:** `.env`ファイルには機密情報が含まれるため、必ず`.gitignore`に追加し、リポジトリにコミットしないでください。

### プロジェクトをビルド

```bash
npm run build
```

これにより、JavaScriptファイルがバンドルされ、`docs/js`ディレクトリ（GitHub Pages用）に配置されます。

### ローカルでアプリケーションを実行

シンプルなHTTPサーバーを使用して`docs`ディレクトリを提供します。

```bash
npx serve docs
```

ブラウザを開き、`http://localhost:5000`（またはサーバーが指定するポート）にアクセスします。

## 使用方法

1. **サインイン:** 資格情報を使用してHearTalkにサインインします。
2. **プロフィールの表示:** サインイン後、自分のプロフィール情報（名前、プロフィール画像、現在の心拍数）を表示します。
3. **プロフィールの編集:**
   - 「プロフィール編集」ボタンをクリック。
   - 名前を更新し、ドラッグ＆ドロップまたはクリックして画像を選択してアップロード。
   - 画像をクロップし、変更を保存。
4. **心拍数モニタリング:**
   - リアルタイムの心拍数データを動的なグラフで表示。
   - 心拍数履歴が維持され、トレンドを追跡。
5. **QRコード:** ユニークなQRコードを生成し、友達と共有。
6. **友達の管理:**
   - 許可された友達のリストを表示。
   - 検索ボックスを使用して友達を検索および管理。
7. **通知:** 心拍数アラートや更新に関連するタイムリーな通知を受信。

## プロジェクト構成

```
heartalk/
├── .env
├── package.json
├── webpack.config.js
├── README.md
├── docs/
│   ├── index.html
│   ├── js/
│   │   ├── main.bundle.js
│   │   └── login.bundle.js
│   └── css/
│       └── styles.css
├── scripts/
│   ├── main.js
│   └── login.js
├── lang/
│   ├── ja.json
│   └── en.json
└── assets/
    ├── images/
    └── icons/
```

- **.env:** Firebase設定の環境変数。
- **package.json:** プロジェクトの依存関係とスクリプト。
- **webpack.config.js:** Webpackの設定ファイル。
- **README.md:** プロジェクトのドキュメント。
- **docs/**: デプロイ用ディレクトリ。
- **scripts/**: ソースJavaScriptファイル。
- **lang/**: 多言語対応用のJSONファイル。
- **assets/**: 画像やアイコンなどの静的アセット。

## 貢献方法

HearTalkへの貢献は大歓迎です。以下の手順に従って貢献してください。

1. **リポジトリをフォーク**

   リポジトリページの右上にある「Fork」ボタンをクリックします。

2. **フォークしたリポジトリをクローン**

   ```bash
   git clone https://github.com/yourusername/heartalk.git
   cd heartalk
   ```

3. **新しいブランチを作成**

   ```bash
   git checkout -b feature/YourFeatureName
   ```

4. **変更を加える**

   新機能を追加したり、バグを修正したりします。

5. **変更をコミット**

   ```bash
   git add .
   git commit -m "Add your descriptive commit message"
   ```

6. **フォークしたリポジトリにプッシュ**

   ```bash
   git push origin feature/YourFeatureName
   ```

7. **プルリクエストを作成**

   元のリポジトリにプルリクエストを作成します。

## ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下でライセンスされています。

## お問い合わせ

ご質問やフィードバックがありましたら、以下までご連絡ください。

- **名前:** 高田崇天
- **メール:** takada[at]ah.iit.tsukuba.ac.jp
- **GitHub:** [Takadasohta](https://github.com/TakadaSohta)

## 謝辞

- [Firebase](https://firebase.google.com/) - 強力なバックエンドサービスの提供。
- [Chart.js](https://www.chartjs.org/) - データ視覚化のためのライブラリ。
- [Cropper.js](https://github.com/fengyuanchen/cropperjs) - 画像クロップ機能の提供。
- [QRCode.js](https://davidshimjs.github.io/qrcodejs/) - QRコード生成のためのライブラリ。
- [Font Awesome](https://fontawesome.com/) - アイコン提供。
- [Webpack](https://webpack.js.org/) - モジュールバンドリングのためのツール。
- [Babel](https://babeljs.io/) - JavaScriptトランスパイリングのためのツール。

---
