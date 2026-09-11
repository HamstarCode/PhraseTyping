import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.form} aria-label="TYPE ROOM作成フォーム">
        <div className={styles.field}>
          <label htmlFor="situation">状況入力</label>
          <textarea id="situation" name="situation" placeholder="例：海外のカフェで注文するとき" rows={4} />
        </div>

        <div className={styles.field}>
          <label htmlFor="difficulty">難易度</label>
          <div className={styles.selectWrapper}>
            <select id="difficulty" name="difficulty" defaultValue="normal">
              <option value="easy">やさしい</option>
              <option value="normal">ふつう</option>
              <option value="hard">むずかしい</option>
            </select>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.createButton} type="button">
            TYPE ROOM作成
          </button>
          <button className={styles.roomListButton} type="button">
            ROOM一覧
          </button>
        </div>
      </section>
    </main>
  );
}
