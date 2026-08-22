export const REWARD_TAB_ROUTES = {
  quests: '/quests',
  shop: '/shop',
  inventory: '/inventory',
}

export const REWARD_TAB_BY_PATH = Object.fromEntries(
  Object.entries(REWARD_TAB_ROUTES).map(([tab, path]) => [path, tab])
)

export const REWARD_PATHS = Object.values(REWARD_TAB_ROUTES)
