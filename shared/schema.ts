import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
});

export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  education: text("education"),
  educationGrade: text("education_grade"),
  gradeType: text("grade_type"),
  hasLanguageTest: text("has_language_test"),
  languageTest: text("language_test"),
  ieltsScore: text("ielts_score"),
  courseRelevance: text("course_relevance"),
  courseType: text("course_type"),
  institutionType: text("institution_type"),
  gapYears: text("gap_years"),
  proofOfFunds: text("proof_of_funds"),
  strongSOP: text("strong_sop"),
  publicUniversityLOA: text("public_university_loa"),
  hasWorkExperience: text("has_work_experience"),
  workExperienceYears: text("work_experience_years"),
  financialCapacity: text("financial_capacity"),
  preferredIntake: text("preferred_intake"),
  preferredProvince: text("preferred_province"),
  eligibilityScore: integer("eligibility_score"),
  status: text("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => [
  index("submissions_email_idx").on(table.email),
  index("submissions_phone_idx").on(table.phone),
]);

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const spouseSubmissions = pgTable("spouse_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  spouseName: text("spouse_name"),
  permitType: text("permit_type"),
  durationInformation: text("duration_information"),
  nocLevel: text("noc_level"),
  canadaFunds: text("canada_funds"),
  indiaFunds: text("india_funds"),
  credits: text("credits"),
  marriageDuration: text("marriage_duration"),
  eligibilityScore: integer("eligibility_score"),
  status: text("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => [
  index("spouse_submissions_email_idx").on(table.email),
  index("spouse_submissions_phone_idx").on(table.phone),
]);

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
}).partial({
  education: true,
  educationGrade: true,
  gradeType: true,
  hasLanguageTest: true,
  languageTest: true,
  ieltsScore: true,
  courseRelevance: true,
  courseType: true,
  institutionType: true,
  gapYears: true,
  proofOfFunds: true,
  strongSOP: true,
  publicUniversityLOA: true,
  hasWorkExperience: true,
  workExperienceYears: true,
  financialCapacity: true,
  preferredIntake: true,
  preferredProvince: true,
  eligibilityScore: true,
  status: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
});

export const insertSpouseSubmissionSchema = createInsertSchema(spouseSubmissions).omit({
  id: true,
  submittedAt: true,
}).partial({
  spouseName: true,
  permitType: true,
  durationInformation: true,
  nocLevel: true,
  canadaFunds: true,
  indiaFunds: true,
  credits: true,
  marriageDuration: true,
  eligibilityScore: true,
  status: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  submittedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertSpouseSubmission = z.infer<typeof insertSpouseSubmissionSchema>;
export type SpouseSubmission = typeof spouseSubmissions.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
