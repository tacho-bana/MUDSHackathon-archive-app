# Slack Archive Viewer

Slackワークスペースの全データを取得し、オフラインで閲覧可能なSlack風Webアプリケーション。トライアル期間終了後も過去のメッセージを検索・閲覧できます。

## 🚀 概要
Slack APIから指定したワークスペースの全データ（チャンネル・メッセージ・ユーザー・ファイル）を包括的に取得し、完全オフラインで動作するSlack風のWebアプリケーションです。

## 技術スタック
- **フロントエンド**: React + TypeScript + Tailwind CSS
- **バックエンド**: Node.js + Express + TypeScript
- **Slack API**: @slack/web-api + OAuth 2.0 + Events API
- **スケジューラー**: node-cron
- **データベース**: SQLite（開発用）
- **認証**: JWT + bcrypt

## ✨ 特徴

### 🎯 主要機能
- **完全データ取得**: ワークスペースの全チャンネル・メッセージ・ユーザー情報を包括的に取得
- **Slack風UI**: 本家Slackそっくりのデザインとユーザー体験
- **完全オフライン**: Slack APIへの接続不要で動作（取得後）
- **高度な検索**: メッセージ内容・ユーザー名・チャンネル・日付での絞り込み検索
- **添付ファイル表示**: アーカイブされたファイルの表示対応
- **レスポンシブデザイン**: デスクトップとモバイル対応

### 🎨 UI特徴
- **左サイドバー**: チャンネル一覧（パブリック・プライベート・管理者限定）
- **メインエリア**: Slack風メッセージ表示（ユーザーアバター・時刻・グルーピング）
- **検索バー**: 全文検索とフィルター機能
- **認証システム**: プライベートチャンネルのパスワード保護

## プロジェクト構成
```
slack-archive-viewer/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── types/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── services/slack.ts
│   │   └── utils/
│   └── package.json
├── .env.example
└── README.md
```

## セットアップ

### 1. 依存関係のインストール

```bash
# バックエンド
cd backend
npm install

# フロントエンド
cd ../frontend
npm install
```

### 2. 環境変数の設定

`backend/.env` ファイルを作成し、実際のSlackワークスペースの情報を設定してください：

```env
# Slack API設定（必須）
SLACK_ACCESS_TOKEN=xoxb-your-actual-bot-token
SLACK_WORKSPACE_ID=T123456789ABCD

# アプリ設定（オプション）
SLACK_CLIENT_ID=your_slack_app_client_id
SLACK_CLIENT_SECRET=your_slack_app_client_secret
SLACK_REDIRECT_URI=http://localhost:3000/auth/slack/callback
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_admin_password
DATABASE_URL=./data/archive.db
PORT=3000
```

**⚠️ 重要**: 
- `SLACK_ACCESS_TOKEN`: 実際のSlack Botトークン（必須）
- `SLACK_WORKSPACE_ID`: 実際のワークスペースID（必須）
- これらがないとアプリは動作しません（サンプルデータも作成されません）

### 3. 開発サーバーの起動

```bash
# バックエンドサーバー（ポート3000）
cd backend
npm run dev

# フロントエンドサーバー（ポート3001）
cd frontend
npm run dev
```

### 4. アプリケーションの確認

ブラウザで `http://localhost:3001` にアクセスしてアプリケーションを確認できます。

## サンプルデータ

開発環境では自動的にサンプルデータが作成されます：

### チャンネル
- **#general** (パブリック) - 誰でもアクセス可能
- **#random** (パブリック) - 誰でもアクセス可能
- **🔒private-project** (プライベート) - パスワード: `project123`
- **👑admin-only** (管理者専用) - 管理者パスワードが必要

### ユーザー
- Alice Smith (管理者)
- Bob Johnson
- Charlie Brown

## 認証システム

### プライベートチャンネル
- パスワードによる認証
- private-projectチャンネルのパスワード: `project123`

### 管理者チャンネル
- 管理者パスワードによる認証
- デフォルトパスワード: `admin123`

## API エンドポイント

### 基本API
- `GET /api/health` - ヘルスチェック
- `GET /api/workspaces` - ワークスペース一覧
- `GET /api/channels` - チャンネル一覧
- `GET /api/channels/:id/messages` - メッセージ取得

### 認証API
- `POST /api/auth/channel` - チャンネル認証
- `POST /api/auth/admin` - 管理者認証

### Slack API
- `GET /api/slack/auth` - Slack認証URL取得
- `POST /api/slack/callback` - Slack認証コールバック
- `POST /api/slack/import` - データインポート
- `POST /api/slack/sync` - データ同期

## Slack App設定

Slack Appの作成と設定については、以下のスコープが必要です：

### OAuth Scopes
- `channels:read` - パブリックチャンネル情報
- `channels:history` - パブリックチャンネルメッセージ
- `groups:read` - プライベートチャンネル情報
- `groups:history` - プライベートチャンネルメッセージ
- `users:read` - ユーザー情報
- `files:read` - ファイル情報

### Redirect URLs
- `http://localhost:3000/auth/slack/callback`

## 開発

### バックエンド
```bash
cd backend
npm run dev    # 開発サーバー起動
npm run build  # ビルド
npm run start  # プロダクションサーバー起動
```

### フロントエンド
```bash
cd frontend
npm run dev     # 開発サーバー起動
npm run build   # ビルド
npm run preview # ビルド結果のプレビュー
```

## 注意事項

- このアプリケーションは開発/デモ用途を想定しています
- 本番環境で使用する場合は、セキュリティ設定を適切に行ってください
- Slack APIの利用規約を遵守してください
- SQLiteデータベースファイルは`data/archive.db`に保存されます

## ライセンス

MIT License