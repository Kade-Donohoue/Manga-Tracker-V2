import { relations, sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  foreignKey,
  unique,
} from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }),
  role: text('role').notNull().default('user'),
  banned: integer('banned', { mode: 'boolean' }),
  banReason: text('banReason'),
  banExpires: integer('banExpires', { mode: 'timestamp' }),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  timezone: text('timezone'),
  city: text('city'),
  country: text('country'),
  region: text('region'),
  regionCode: text('region_code'),
  colo: text('colo'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  impersonatedBy: text('impersonatedBy'),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const friends = sqliteTable(
  'friends',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    senderId: text('senderId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    receiverId: text('receiverId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['pending', 'accepted', 'declined'],
    })
      .default('pending')
      .notNull(),
    sentAt: text('sentAt')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    respondedAt: text('respondedAt'),
  },
  (table) => [unique('friends_unique').on(table.senderId, table.receiverId)]
);

export const userData = sqliteTable(
  'userData',
  {
    userID: text('userID')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mangaId: text('mangaId').notNull(),
    userTitle: text('userTitle'),
    currentIndex: integer('currentIndex').notNull(),
    currentChap: text('currentChap').notNull(),
    userCat: text('userCat').notNull(),
    interactTime: integer('interactTime').notNull(),
    addedAt: integer('addedAt')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    userCoverIndex: integer('userCoverIndex').notNull().default(-1),
  },
  (table) => [primaryKey({ columns: [table.userID, table.mangaId] })]
);

export const mangaData = sqliteTable('mangaData', {
  mangaId: text('mangaId').primaryKey(),
  mangaName: text('mangaName').notNull(),
  urlBase: text('urlBase').notNull(),
  slugList: text('slugList').notNull(),
  chapterTextList: text('chapterTextList').notNull(),
  latestChapterText: real('latestChapterText').notNull(),
  updateTime: text('updateTime').notNull(),
  useAltStatCalc: integer('useAltStatCalc', { mode: 'boolean' }).notNull().default(false),
  specialFetchData: text('specialFetchData'),
  sourceId: text('sourceId').unique(),
});

export const userCategories = sqliteTable(
  'userCategories',
  {
    userID: text('userID')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    value: text('value').notNull(),
    color: text('color').notNull(),
    stats: integer('stats', { mode: 'boolean' }).notNull().default(true),
    public: integer('public', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userID, table.value] })]
);

export const coverImages = sqliteTable(
  'coverImages',
  (t) => ({
    id: t.integer('id').primaryKey({ autoIncrement: true }),
    mangaId: t
      .text('mangaId')
      .notNull()
      .references(() => mangaData.mangaId),
    coverIndex: t.integer('coverIndex').notNull(),
    savedAt: t
      .text('savedAt')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  }),
  (table) => [unique('coverImage_Unique').on(table.mangaId, table.coverIndex)]
);

export const userStats = sqliteTable('userStats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', {
    enum: ['chapsRead', 'newManga'],
  }).notNull(),
  timestamp: text('timestamp')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  mangaId: text('mangaId').notNull(),
  userID: text('userID')
    .notNull()
    .references(() => user.id),
  value: real('value').notNull(),
});

export const mangaStats = sqliteTable('mangaStats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', {
    enum: ['chapCount', 'mangaCount'],
  }).notNull(),
  timestamp: text('timestamp')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  mangaId: text('mangaId'),
  value: real('value').notNull(),
});

export const recommendations = sqliteTable(
  'recommendations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recommenderId: text('recommenderId')
      .notNull()
      .references(() => user.id),
    mangaId: text('mangaId').notNull(),
    receiverId: text('receiverId')
      .notNull()
      .references(() => user.id),
    message: text('message'),
    status: text('status').notNull().default('pending'),
    createdAt: text('createdAt')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [unique('recommend_Unique').on(table.recommenderId, table.receiverId, table.mangaId)]
);

export const apikey = sqliteTable('apikey', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  start: text('start').notNull(),
  prefix: text('prefix').notNull(),
  key: text('key').notNull(),
  userId: text('userId').notNull(),
  refillInterval: integer('refillInterval'), // ms
  refillAmount: integer('refillAmount'),
  lastRefillAt: integer('lastRefillAt', { mode: 'timestamp_ms' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  rateLimitEnabled: integer('rateLimitEnabled', { mode: 'boolean' }).notNull().default(false),
  rateLimitTimeWindow: integer('rateLimitTimeWindow'), // ms
  rateLimitMax: integer('rateLimitMax'),
  requestCount: integer('requestCount').default(0),
  remaining: integer('remaining'),
  lastRequest: integer('lastRequest', { mode: 'timestamp_ms' }),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  permissions: text('permissions'),
  metadata: text('metadata').$type<Record<string, any> | null>(),
});

export const dailyUserStats = sqliteTable(
  'dailyUserStats',
  {
    userID: text('userID').notNull(),
    date: text('date').notNull(), // YYYY-MM-DD
    totalCurrentChapters: real('totalCurrentChapters').notNull(),
    totalLatestChapters: real('totalLatestChapters').notNull(),
    backlog: real('backlog').notNull(), // latest - current
    pastMonthReads: real('pastMonthReads').notNull(),
    updatedAt: text('updatedAt')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [primaryKey({ columns: [t.userID, t.date] })]
);

export const globalDailyStats = sqliteTable(
  'globalDailyStats',
  {
    date: text('date').notNull(),
    mangaTracked: integer('mangaTracked').notNull(),
    newChapters30: integer('newChapters30').notNull(),
    newManga30: integer('newManga30').notNull(),
    totalChaptersTracked: integer('totalChaptersTracked').notNull(),
    totalChaptersRead: integer('totalChaptersRead').notNull(),
    updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
    chaptersRead30: integer('chaptersRead30').notNull(),
  },
  (t) => [primaryKey({ columns: [t.date] })]
);

//--------------------------
// Relations Between Tables
//--------------------------

export const userDataRelations = relations(userData, ({ one, many }) => ({
  user: one(user, {
    fields: [userData.userID],
    references: [user.id],
  }),
  manga: one(mangaData, {
    fields: [userData.mangaId],
    references: [mangaData.mangaId],
  }),
  categories: one(userCategories, {
    fields: [userData.userCat],
    references: [userCategories.value],
  }),
  // friends: one()
}));

export const mangaDataRelations = relations(mangaData, ({ many }) => ({
  coverImages: many(coverImages),
}));

export const mangaCoverRelations = relations(coverImages, ({ one }) => ({
  mangaData: one(mangaData, {
    fields: [coverImages.mangaId],
    references: [mangaData.mangaId],
  }),
}));

export const friendsRelations = relations(friends, ({ one }) => ({
  sender: one(user, {
    fields: [friends.senderId],
    references: [user.id],
  }),
  receiver: one(user, {
    fields: [friends.receiverId],
    references: [user.id],
  }),
}));

export const userCategoriesRelations = relations(userCategories, ({ one }) => ({
  user: one(user, {
    fields: [userCategories.userID],
    references: [user.id],
  }),
}));

export const usersRelations = relations(user, ({ many }) => ({
  categories: many(userCategories),
  sentFriends: many(friends, {
    relationName: 'sender',
  }),
  receivedFriends: many(friends, {
    relationName: 'receiver',
  }),
}));
