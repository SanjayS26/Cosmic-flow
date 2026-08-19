import { useState } from 'react';

const LEGACY_KEY = 'kanban-board-data';
const NOTICE_KEY = 'legacy-board-notice-dismissed';

export default function LegacyDataNotice() {
  const [visible, setVisible] = useState(() => (
    Boolean(localStorage.getItem(LEGACY_KEY))
    && localStorage.getItem(NOTICE_KEY) !== 'true'
  ));

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(NOTICE_KEY, 'true');
    setVisible(false);
  };

  const clearLegacyData = () => {
    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(NOTICE_KEY, 'true');
    setVisible(false);
  };

  return (
    <aside className="legacy-notice" role="status">
      <p>
        An older local-only board was found. It is not part of your database projects
        and has not been uploaded or deleted.
      </p>
      <div>
        <button type="button" onClick={dismiss}>Dismiss</button>
        <button type="button" onClick={clearLegacyData}>Clear legacy data</button>
      </div>
    </aside>
  );
}
