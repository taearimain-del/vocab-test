# CLAUDE.md — 単語テスト

「英語長文ポラリス」「英検準1級ライティング特訓」両方の単語帳データを読み込んで動く、
汎用の単語テストアプリ（独立リポジトリ、GitHub Pages公開）。

## 出題ロジック（2026-09-01・Fort様の紙の単語帳の回し方を再現）
- 各単語に「連続正解回数」を持たせる（`correctCounts`、localStorage + Supabase同期）。
- 各ラウンドの出題対象は「連続正解回数がまだしきい値未満の単語」全部。
- 正解 → 連続正解回数+1。しきい値に達したら「習得済み」としてプールから完全に除外（もう出題しない）。
- 不正解 → 連続正解回数を0にリセット（次のラウンドでまた出題対象になる）。
- これにより「得意な単語はすぐしきい値に到達して消えていき、苦手な単語だけが何周も残る」という
  紙の単語帳の運用を再現している。「不正解だった単語だけを次周に回す」単純な絞り込み方式は
  一度でも正解した単語が二度と出題されなくなる不具合があったため不採用（検証の過程で発見・修正）。
- **しきい値は1〜10でセットごとに自由に設定できる**（`progress[setId].threshold`、デフォルト5）。
  セット詳細画面のセレクトボックスで変更可能。既存の`correctCounts`はそのままに、新しい
  しきい値で毎回再判定するだけなので、変更すると「1回しか正解していない語が急に習得済みになる」
  「逆に習得済みだった語がまた出題対象に戻る」ことが起こる（意図した挙動）。
  進捗リセット（`resetSetProgress`）をしてもしきい値の設定自体は保持される。

## レッスン/DAY単位テスト（2026-09-01追加）
- セット詳細画面の各レッスン/DAYアコーディオンに「このレッスンをテストする」ボタンがある。
  `buildRoundQueue(setId, lessonNumber)`の第2引数でそのレッスンの未習得語だけに絞り込む
  （出題ロジック自体は上記と同じ。5連続正解の判定・カウントはセット全体で共有）。

## データソース・ビルド
- `data/polaris/vocab01〜12.json`：`claude/english-reading-pdf-creation-up3lu1`ブランチの
  `長文ポラリス音読/data/`からコピー（12レッスン×20語=240語が初期状態）。
  **2026-09-01、本文（同ブランチ`長文ポラリス音読/data/lessonNN.json`）を精読し、
  既存20語に含まれていなかった専門語・低頻度語を59語追加（計299語、レッスンごとに2〜17語の
  可変）。Fort様確認済みで、今回は単語テストアプリのデータのみ更新——元の
  「長文ポラリス音読」PDFプロジェクト側（`長文ポラリス_単語帳.pdf`）には反映していないため、
  PDF単語帳とこのアプリの収録語数は現在ズレている（PDF=240語、アプリ=299語）。
  PDF側にも反映するかは別途判断。**
- `data/eiken/vocab01〜30.json`：`英検準1級ライティング対策/単語帳/data/`と同じもの
  （30DAY×8語=240語、英検側は難語追加の対象外）。
- **どちらかのvocab*.jsonを更新したら、必ず`node scripts/build.mjs`を実行してから
  push すること。** `index.html`内の`/*POLARIS_DATA*/…/*END*/`・`/*EIKEN_DATA*/…/*END*/`
  というプレースホルダーにJSONを注入する方式（today-task.htmlと同じ「単一HTMLに
  データを埋め込む」設計。fetchでの外部JSON読み込みはしていない）。

## デプロイ（GitHub Pages）
- 独立GitHubリポジトリ：`taearimain-del/vocab-test`（Public）
- 本番URL：https://taearimain-del.github.io/vocab-test/
- `index.html`本体はパスワード保護なし（2026-09-01、アカウント方式への移行に伴い
  access-gate.jsを撤去。下記「アカウント方式」参照）。
  `admin-log.html`（管理者専用ログページ）だけは引き続きaccess-gate.jsで保護している。
- `<meta name="robots" content="noindex, nofollow">`と`robots.txt`で検索エンジンからは隠す。

## アカウント方式（2026-09-01、8桁同期コード方式から全面移行）
- 認証は一切なし。初回起動時（`localStorage['vocab-test-account']`が未設定）は
  アカウント選択画面（`route:'account'`）が出る。Supabaseの`vocab_test_accounts`
  テーブルから名前一覧を取得して並べるだけで、パスワードやPINは要求しない。
  一覧が取れない場合は`FALLBACK_ACCOUNTS = ['Fort_Dex', '小山']`を表示。
- 「新しい名前で追加」から誰でも自由に新規アカウントを作成できる
  （`addAccount()`→`vocab_test_accounts`にinsert）。Fort様・小山以外の友人も想定。
- アカウントを選ぶと`localStorage`に保存され、以後はその端末で自動ログインされる
  （`boot()`時に`currentAccount`があれば自動で進捗をpullしてホーム画面へ）。
  「アカウント切替」ボタン（ホーム/セット詳細画面の上部バッジ）でいつでも選び直せる。
- 進捗の同期先は「アカウント名」そのもの。`writing_sync`テーブルの`sync_code`カラムに
  `'vocab-test::' + アカウント名` を入れて保存・取得している（旧・ランダム8桁コードの
  手動共有は廃止。同じアカウント名を選べばどの端末でも自動的に同じ進捗に同期される）。
- Fort様専用の操作ログ：`vocab_test_log`テーブル（追記のみ、RLSで anon の insert/select
  を許可）に`logAction(action, detail)`で記録している。記録している操作は
  `login`（アカウント選択時）・`test_finish`（ラウンド終了時、正解数等）・
  `reset_set`（セット全体リセット）・`reset_lesson`（レッスン単位リセット）の4種類
  （単語ごとの「覚えた」ボタン押下はログ量が増えすぎるため対象外とした）。
  `admin-log.html`（access-gate.js保護・Fort様専用）で全ログをアカウント別に一覧表示できる
  （3D-bunkasai-2026の`pageview-log.html`のイメージを踏襲、実装はFirebaseではなくSupabase）。
- Supabase側のテーブル定義（`vocab_test_accounts`: name主キー / `vocab_test_log`:
  id・account_name・ts・action・detail jsonb）はSQL Editorで直接作成済み
  （claude-in-chromeでの操作、2026-09-01）。
- 今回は単語テストアプリでのパイロット実装。マイポータル本体・他の掲載アプリ
  （英検準1級ライティング特訓・過去問プレイヤー・世界史/古文関連・音声教材ハブ等）への
  同様のアカウントログイン機能の横展開は別途相談のうえ着手する（未着手）。

## Supabase同期（テーブル共用について）
- today-task.htmlと同じSupabaseプロジェクト（`writing_sync`テーブル）を間借りしている。
  ペイロードに`app: 'vocab-test'`を含めて区別しているだけで、テーブル自体は共用。
  `sync_code`列には`'vocab-test::' + アカウント名`という専用プレフィックス付きの値を
  入れているので、today-task.html側のランダム8桁コードとは衝突しない。
