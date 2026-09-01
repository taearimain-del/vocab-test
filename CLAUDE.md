# CLAUDE.md — 単語テスト

「英語長文ポラリス」「英検準1級ライティング特訓」両方の単語帳データを読み込んで動く、
汎用の単語テストアプリ（独立リポジトリ、GitHub Pages公開）。

## 出題ロジック（2026-09-01・Fort様の紙の単語帳の回し方を再現）
- 各単語に「連続正解回数」を持たせる（`correctCounts`、localStorage + Supabase同期）。
- 各ラウンドの出題対象は「連続正解回数がまだ5未満の単語」全部。
- 正解 → 連続正解回数+1。5に達したら「習得済み」としてプールから完全に除外（もう出題しない）。
- 不正解 → 連続正解回数を0にリセット（次のラウンドでまた出題対象になる）。
- これにより「得意な単語はすぐ5回に到達して消えていき、苦手な単語だけが何周も残る」という
  紙の単語帳の運用を再現している。「不正解だった単語だけを次周に回す」単純な絞り込み方式は
  一度でも正解した単語が二度と出題されなくなる不具合があったため不採用（検証の過程で発見・修正）。

## データソース・ビルド
- `data/polaris/vocab01〜12.json`：`claude/english-reading-pdf-creation-up3lu1`ブランチの
  `長文ポラリス音読/data/`からコピー（12レッスン×20語=240語）。
- `data/eiken/vocab01〜30.json`：`英検準1級ライティング対策/単語帳/data/`と同じもの
  （30DAY×8語=240語）。
- **どちらかのvocab*.jsonを更新したら、必ず`node scripts/build.mjs`を実行してから
  push すること。** `index.html`内の`/*POLARIS_DATA*/…/*END*/`・`/*EIKEN_DATA*/…/*END*/`
  というプレースホルダーにJSONを注入する方式（today-task.htmlと同じ「単一HTMLに
  データを埋め込む」設計。fetchでの外部JSON読み込みはしていない）。

## デプロイ（GitHub Pages）
- 独立GitHubリポジトリ：`taearimain-del/vocab-test`（Public）
- 本番URL：https://taearimain-del.github.io/vocab-test/
- `access-gate.js`（`my-portal-ryu.netlify.app`でホスト）によるパスワード/Googleログインの
  ロック必須。`index.html`の`<head>`相当部分に組み込み済み。
- `<meta name="robots" content="noindex, nofollow">`と`robots.txt`で検索エンジンからは隠す。

## Supabase同期
- today-task.htmlと同じSupabaseプロジェクト（`writing_sync`テーブル）を間借りしている。
  ペイロードに`app: 'vocab-test'`を含めて区別しているだけで、テーブル自体は共用。
  同期コードはtoday-task.html側とは別に生成されるので衝突しない。
