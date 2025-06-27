# Slack Archive Viewer

Slack APIと連携したメッセージアーカイブビューアーアプリケーション

## 概要
Slack APIから指定したワークスペースのデータを取得・保存し、Slack風UIで表示するWebアプリケーションです。プライベートチャンネルにはアクセス制御機能を実装しています。

## 技術スタック
- **フロントエンド**: React + TypeScript + Tailwind CSS
- **バックエンド**: Node.js + Express + TypeScript
- **Slack API**: @slack/web-api + OAuth 2.0 + Events API
- **スケジューラー**: node-cron
- **データベース**: SQLite（開発用）
- **認証**: JWT + bcrypt

## 主要機能
- Slack OAuth 2.0認証
- チャンネル・メッセージデータの取得・保存
- Slack風UIでのメッセージ表示
- プライベートチャンネルのアクセス制御
- 自動・手動データ同期機能
- 検索・フィルタリング機能

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

`.env.example`ファイルをコピーして`.env`ファイルを作成し、必要な値を設定してください：

```bash
cp .env.example .env
```

必須の環境変数：
- `SLACK_CLIENT_ID`: Slack AppのClient ID
- `SLACK_CLIENT_SECRET`: Slack AppのClient Secret
- `JWT_SECRET`: JWT署名用のシークレットキー
- `ADMIN_PASSWORD`: 管理者パスワード（デフォルト: admin123）

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