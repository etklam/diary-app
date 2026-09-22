export type Audience = 'guest' | 'USER' | 'ADMIN';
export type Section = 'overview' | 'diary' | 'portfolio' | 'research' | 'more';
export type Destination = {
  id: string; section: Section; title: string; audience: Audience;
  href?: '/timeline' | '/calendar' | '/review' | '/account';
};

// Access and implementation readiness are separate. Missing href means informational only.
export const destinations: readonly Destination[] = [
  { id: 'timeline', section: 'diary', title: 'Timeline', audience: 'USER', href: '/timeline' },
  { id: 'calendar', section: 'diary', title: 'Calendar', audience: 'USER', href: '/calendar' },
  { id: 'review', section: 'diary', title: 'Diary Review', audience: 'USER', href: '/review' },
  { id: 'full-diary', section: 'diary', title: 'Full Diary and transactions', audience: 'USER' },
  { id: 'plans', section: 'diary', title: 'Trade Plans', audience: 'USER' },
  { id: 'workspace', section: 'overview', title: 'Daily workspace', audience: 'USER' },
  { id: 'holdings', section: 'portfolio', title: 'Holdings and exposure', audience: 'USER' },
  { id: 'performance', section: 'portfolio', title: 'Performance and exports', audience: 'USER' },
  { id: 'watchlist', section: 'research', title: 'Watchlist and Company Hub', audience: 'USER' },
  { id: 'thesis', section: 'research', title: 'Notes, Evidence and Thesis', audience: 'USER' },
  { id: 'tools', section: 'research', title: 'ETF, Market State and Rotation', audience: 'guest' },
  { id: 'calculators', section: 'research', title: 'Sizing, FIRE, Relative Value and Seasonality', audience: 'guest' },
  { id: 'sec', section: 'research', title: 'SEC filings and downloads', audience: 'guest' },
  { id: 'account', section: 'more', title: 'Account and support', audience: 'USER', href: '/account' },
  { id: 'more-review', section: 'more', title: 'Diary Review', audience: 'USER', href: '/review' },
  { id: 'more-plans', section: 'more', title: 'Trade Plans', audience: 'USER' },
  { id: 'alerts', section: 'more', title: 'Reminders and price alerts', audience: 'USER' },
  { id: 'discipline', section: 'more', title: 'Discipline', audience: 'USER' },
  { id: 'partners', section: 'more', title: 'Partners and API keys', audience: 'USER' },
  { id: 'articles', section: 'more', title: 'Articles and Guide', audience: 'guest' },
  { id: 'admin', section: 'more', title: 'Publishing, users and market administration', audience: 'ADMIN' },
];

export function visibleDestinations(section: Section, audience: Audience) {
  return destinations.filter(item => item.section === section &&
    (item.audience === 'guest' || audience === 'ADMIN' || item.audience === audience));
}
