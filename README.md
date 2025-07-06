# claude-code-session-checker

Claude Code Max planのセッション使用量を可視化するCLIツールです。  
npxでインストール不要で即座に使用できます。

## 機能

- **現在の使用状況表示** - 今月のセッション数と制限との比較
- **進行中セッション監視** - 現在のセッションの残り時間を表示
- **使用量予測** - 現在のペースでの月末予測
- **履歴表示** - 過去のセッション履歴を確認

## インストール

### npxで即座に実行（推奨）

```bash
# インストール不要で即座に実行
npx claude-code-session-checker status
```

### グローバルインストール

```bash
# 一度インストールして繰り返し使用
npm install -g claude-code-session-checker

# インストール後はコマンド名で実行可能
claude-code-session-checker status
```

### プロジェクトローカルインストール

```bash
# プロジェクト内でのみ使用
npm install claude-code-session-checker
npx claude-code-session-checker status
```

## 使用方法

### 基本コマンド

```bash
# 現在の使用状況を表示
claude-code-session-checker status

# 過去7日間の履歴を表示
claude-code-session-checker history

# 過去30日間の履歴を表示
claude-code-session-checker history 30

# 使用量予測を表示
claude-code-session-checker predict
```

## 出力例

### `status` コマンド

```
🤖 Claude Code セッション使用状況

🟢 今月: 23/50 セッション (46%)
✅ 推定月末到達: 42セッション

⏱️  現在のセッション: 2時間12分経過 (残り2時間48分)
📁 プロジェクト: /Users/username/workspace/web-base
```

### `history` コマンド

```
📅 過去7日間のセッション履歴

Sun Jun 16 2024: 3セッション
  09:15 - web-base
  14:30 - figma-plugin
  20:45 - web-base

Mon Jun 17 2024: 2セッション
  10:00 - web-base
  16:20 - movie-app
```

### `predict` コマンド

```
📊 使用量予測

1日平均: 1.8セッション
月末予測: 54セッション

残り18日で27セッション
推奨ペース: 1日1.5セッション以下

⚠️  現在のペースでは制限に達する可能性があります
```

## 技術仕様

### データソース

Claude Codeのセッションデータは以下から読み取ります：

```
~/.claude/projects/
├── -Users-username-workspace-project1/
│   ├── session-uuid1.jsonl
│   ├── session-uuid2.jsonl
│   └── ...
└── -Users-username-workspace-project2/
    ├── session-uuid3.jsonl
    └── ...
```

### セッション定義

- **セッション期間**: 最初のメッセージから5時間
- **月間制限**: 50セッション
- **セッション開始**: JSONLファイル内の最初のユーザーメッセージのタイムスタンプ

### カウント方法

1. 各`.jsonl`ファイルから最初の`type: "user"`メッセージを抽出
2. そのタイムスタンプをセッション開始時刻とする
3. 開始時刻から5時間後を終了時刻とする
4. 現在時刻が範囲内かチェックして進行中セッションを判定

## トラブルシューティング

### `Claude projects directory not found` エラー

Claude Codeを一度も実行していない場合に発生します。
```bash
# Claude Codeを実行して ~/.claude ディレクトリを作成
claude
```

### セッション数が合わない

- Claude Code以外（Web版、Desktop版）の使用量は含まれません
- 削除されたプロジェクトのセッションは除外されます

### パフォーマンス

- 大量のセッションがある場合、初回読み込みに時間がかかることがあります
- JSONLファイルが破損している場合はスキップされます

## 開発・カストマイズ

### ソースコードの取得

```bash
# ソースコードを取得してカストマイズしたい場合
npm pack claude-code-session-checker
tar -xzf claude-code-session-checker-*.tgz
cd package

# または直接node_modulesからアクセス
npm install claude-code-session-checker
cd node_modules/claude-code-session-checker
```

### ローカルでの開発

```bash
# ローカルで開発する場合は直接実行
node index.js status
```

## ライセンス

MIT License

## 貢献

バグ報告や機能リクエストは、npmパッケージのメンテナーまでお連絡ください。

### フィードバックの方法

1. **Issue報告**: バグや改善提案
2. **機能リクエスト**: 新機能の提案
3. **使用例共有**: 他のユーザーに役立つ使い方

## 関連リンク

- [npmパッケージ](https://www.npmjs.com/package/claude-code-session-checker)
- [Claude Code 公式ドキュメント](https://docs.anthropic.com/en/docs/claude-code)
- [Anthropic Max Plan](https://www.anthropic.com/pricing)

---

**注意**: このツールは非公式のものです。Claude Codeの内部データ構造に依存しているため、将来のアップデートで動作しなくなる可能性があります。