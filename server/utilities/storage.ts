import { type User, type InsertUser, type Submission, type InsertSubmission, type RefreshToken, type InsertRefreshToken, type SpouseSubmission, type InsertSpouseSubmission, type ContactMessage, type InsertContactMessage, users, submissions, refreshTokens, spouseSubmissions, contactMessages } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, lt, or } from "drizzle-orm";

export interface DuplicateCheckResult {
  emailExists: boolean;
  phoneExists: boolean;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getSubmissions(): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissionByPhone(phone: string): Promise<Submission | undefined>;
  getSubmissionByEmail(email: string): Promise<Submission | undefined>;
  checkSubmissionDuplicates(email: string, phone: string): Promise<DuplicateCheckResult>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateEligibilityScore(id: string, score: number): Promise<Submission | undefined>;
  updateSubmissionStatus(id: string, status: string): Promise<Submission | undefined>;

  getSpouseSubmissions(): Promise<SpouseSubmission[]>;
  getSpouseSubmission(id: string): Promise<SpouseSubmission | undefined>;
  getSpouseSubmissionByEmail(email: string): Promise<SpouseSubmission | undefined>;
  getSpouseSubmissionByPhone(phone: string): Promise<SpouseSubmission | undefined>;
  checkSpouseSubmissionDuplicates(email: string, phone: string): Promise<DuplicateCheckResult>;
  createSpouseSubmission(submission: InsertSpouseSubmission): Promise<SpouseSubmission>;
  updateSpouseEligibilityScore(id: string, score: number): Promise<SpouseSubmission | undefined>;

  createRefreshToken(refreshToken: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteUserRefreshTokens(userId: string): Promise<void>;
  deleteExpiredRefreshTokens(): Promise<void>;

  getContactMessages(): Promise<ContactMessage[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private submissions: Map<string, Submission>;
  private refreshTokens: Map<string, RefreshToken>;
  private contactMessagesMap: Map<string, ContactMessage>;

  constructor() {
    this.users = new Map();
    this.submissions = new Map();
    this.refreshTokens = new Map();
    this.contactMessagesMap = new Map();
    
    this.seedSampleData();
  }

  private seedSampleData() {
    const sampleSubmissions: Submission[] = [
      {
        id: randomUUID(),
        fullName: "John Smith",
        email: "john.smith@example.com",
        phone: "+1 234 567 8901",
        city: "Mumbai",
        education: "bachelor",
        educationGrade: "8.5",
        gradeType: "cgpa",
        hasLanguageTest: "yes",
        languageTest: "ielts",
        ieltsScore: "7.5",
        courseRelevance: null,
        courseType: null,
        institutionType: null,
        gapYears: null,
        proofOfFunds: null,
        strongSOP: null,
        publicUniversityLOA: null,
        hasWorkExperience: "yes",
        workExperienceYears: "3",
        financialCapacity: "40-60",
        preferredIntake: "september",
        preferredProvince: "ontario",
        eligibilityScore: 85,
        status: "approved",
        submittedAt: new Date("2024-01-15T10:30:00"),
      },
      {
        id: randomUUID(),
        fullName: "Sarah Johnson",
        email: "sarah.j@example.com",
        phone: "+1 234 567 8902",
        city: "Lagos",
        education: "master",
        educationGrade: "9.0",
        gradeType: "cgpa",
        hasLanguageTest: "yes",
        languageTest: "ielts",
        ieltsScore: "8.0",
        courseRelevance: null,
        courseType: null,
        institutionType: null,
        gapYears: null,
        proofOfFunds: null,
        strongSOP: null,
        publicUniversityLOA: null,
        hasWorkExperience: "yes",
        workExperienceYears: "5",
        financialCapacity: "above-60",
        preferredIntake: "january",
        preferredProvince: "british-columbia",
        eligibilityScore: 92,
        status: "approved",
        submittedAt: new Date("2024-01-16T14:20:00"),
      },
      {
        id: randomUUID(),
        fullName: "Michael Chen",
        email: "m.chen@example.com",
        phone: "+1 234 567 8903",
        city: "Beijing",
        education: "12th",
        educationGrade: "75",
        gradeType: null,
        hasLanguageTest: "no",
        languageTest: null,
        ieltsScore: null,
        courseRelevance: null,
        courseType: null,
        institutionType: null,
        gapYears: null,
        proofOfFunds: null,
        strongSOP: null,
        publicUniversityLOA: null,
        hasWorkExperience: "no",
        workExperienceYears: null,
        financialCapacity: "20-40",
        preferredIntake: "may",
        preferredProvince: "alberta",
        eligibilityScore: 70,
        status: "pending",
        submittedAt: new Date("2024-01-17T09:15:00"),
      },
    ];

    sampleSubmissions.forEach((submission) => {
      this.submissions.set(submission.id, submission);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, role: insertUser.role ?? "user" };
    this.users.set(id, user);
    return user;
  }

  async getSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values()).sort((a, b) => {
      return new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime();
    });
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    return this.submissions.get(id);
  }

  async getSubmissionByPhone(phone: string): Promise<Submission | undefined> {
    return Array.from(this.submissions.values()).find(
      (submission) => submission.phone === phone,
    );
  }

  async getSubmissionByEmail(email: string): Promise<Submission | undefined> {
    return Array.from(this.submissions.values()).find(
      (submission) => submission.email === email,
    );
  }

  async checkSubmissionDuplicates(email: string, phone: string): Promise<DuplicateCheckResult> {
    const rows = Array.from(this.submissions.values()).filter(
      (s) => s.email === email || s.phone === phone,
    );
    return {
      emailExists: rows.some((s) => s.email === email),
      phoneExists: rows.some((s) => s.phone === phone),
    };
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const id = randomUUID();
    const submission: Submission = {
      id,
      fullName: insertSubmission.fullName,
      email: insertSubmission.email,
      phone: insertSubmission.phone,
      city: insertSubmission.city,
      education: insertSubmission.education ?? null,
      educationGrade: insertSubmission.educationGrade ?? null,
      gradeType: insertSubmission.gradeType ?? null,
      hasLanguageTest: insertSubmission.hasLanguageTest ?? null,
      languageTest: insertSubmission.languageTest ?? null,
      ieltsScore: insertSubmission.ieltsScore ?? null,
      courseRelevance: insertSubmission.courseRelevance ?? null,
      courseType: insertSubmission.courseType ?? null,
      institutionType: insertSubmission.institutionType ?? null,
      gapYears: insertSubmission.gapYears ?? null,
      proofOfFunds: insertSubmission.proofOfFunds ?? null,
      strongSOP: insertSubmission.strongSOP ?? null,
      publicUniversityLOA: insertSubmission.publicUniversityLOA ?? null,
      hasWorkExperience: insertSubmission.hasWorkExperience ?? null,
      workExperienceYears: insertSubmission.workExperienceYears ?? null,
      financialCapacity: insertSubmission.financialCapacity ?? null,
      preferredIntake: insertSubmission.preferredIntake ?? null,
      preferredProvince: insertSubmission.preferredProvince ?? null,
      eligibilityScore: insertSubmission.eligibilityScore ?? null,
      status: insertSubmission.status || "pending",
      submittedAt: new Date(),
    };
    this.submissions.set(id, submission);
    return submission;
  }

  async updateEligibilityScore(id: string, score: number): Promise<Submission | undefined> {
    const submission = this.submissions.get(id);
    if (submission) {
      submission.eligibilityScore = score;
      this.submissions.set(id, submission);
    }
    return submission;
  }

  async updateSubmissionStatus(id: string, status: string): Promise<Submission | undefined> {
    const submission = this.submissions.get(id);
    if (submission) {
      submission.status = status;
      this.submissions.set(id, submission);
    }
    return submission;
  }

  private spouseSubmissionsMap: Map<string, SpouseSubmission> = new Map();

  async getSpouseSubmissions(): Promise<SpouseSubmission[]> {
    return Array.from(this.spouseSubmissionsMap.values()).sort((a, b) => {
      return new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime();
    });
  }

  async getSpouseSubmission(id: string): Promise<SpouseSubmission | undefined> {
    return this.spouseSubmissionsMap.get(id);
  }

  async getSpouseSubmissionByEmail(email: string): Promise<SpouseSubmission | undefined> {
    return Array.from(this.spouseSubmissionsMap.values()).find(
      (submission) => submission.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async getSpouseSubmissionByPhone(phone: string): Promise<SpouseSubmission | undefined> {
    return Array.from(this.spouseSubmissionsMap.values()).find(
      (submission) => submission.phone === phone,
    );
  }

  async checkSpouseSubmissionDuplicates(email: string, phone: string): Promise<DuplicateCheckResult> {
    const rows = Array.from(this.spouseSubmissionsMap.values()).filter(
      (s) => s.email.toLowerCase() === email.toLowerCase() || s.phone === phone,
    );
    return {
      emailExists: rows.some((s) => s.email.toLowerCase() === email.toLowerCase()),
      phoneExists: rows.some((s) => s.phone === phone),
    };
  }

  async createSpouseSubmission(insertSubmission: InsertSpouseSubmission): Promise<SpouseSubmission> {
    const id = randomUUID();
    const submission: SpouseSubmission = {
      id,
      fullName: insertSubmission.fullName,
      email: insertSubmission.email,
      phone: insertSubmission.phone,
      city: insertSubmission.city,
      spouseName: insertSubmission.spouseName ?? null,
      permitType: insertSubmission.permitType ?? null,
      durationInformation: insertSubmission.durationInformation ?? null,
      nocLevel: insertSubmission.nocLevel ?? null,
      canadaFunds: insertSubmission.canadaFunds ?? null,
      indiaFunds: insertSubmission.indiaFunds ?? null,
      credits: insertSubmission.credits ?? null,
      marriageDuration: insertSubmission.marriageDuration ?? null,
      eligibilityScore: insertSubmission.eligibilityScore ?? null,
      status: insertSubmission.status || "pending",
      submittedAt: new Date(),
    };
    this.spouseSubmissionsMap.set(id, submission);
    return submission;
  }

  async updateSpouseEligibilityScore(id: string, score: number): Promise<SpouseSubmission | undefined> {
    const submission = this.spouseSubmissionsMap.get(id);
    if (submission) {
      submission.eligibilityScore = score;
      this.spouseSubmissionsMap.set(id, submission);
    }
    return submission;
  }

  async createRefreshToken(insertToken: InsertRefreshToken): Promise<RefreshToken> {
    const id = randomUUID();
    const refreshToken: RefreshToken = {
      id,
      userId: insertToken.userId,
      token: insertToken.token,
      expiresAt: insertToken.expiresAt,
      createdAt: new Date(),
    };
    this.refreshTokens.set(insertToken.token, refreshToken);
    return refreshToken;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    return this.refreshTokens.get(token);
  }

  async deleteRefreshToken(token: string): Promise<void> {
    this.refreshTokens.delete(token);
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    for (const [token, refreshToken] of this.refreshTokens.entries()) {
      if (refreshToken.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    const now = new Date();
    for (const [token, refreshToken] of this.refreshTokens.entries()) {
      if (refreshToken.expiresAt < now) {
        this.refreshTokens.delete(token);
      }
    }
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return Array.from(this.contactMessagesMap.values()).sort((a, b) => {
      return new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime();
    });
  }

  async createContactMessage(insertMessage: InsertContactMessage): Promise<ContactMessage> {
    const id = randomUUID();
    const contactMessage: ContactMessage = {
      id,
      name: insertMessage.name,
      email: insertMessage.email,
      phone: insertMessage.phone,
      subject: insertMessage.subject,
      message: insertMessage.message,
      submittedAt: new Date(),
    };
    this.contactMessagesMap.set(id, contactMessage);
    return contactMessage;
  }
}

class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const [user] = await db.insert(users).values({ ...insertUser, id }).returning();
    return user;
  }

  async getSubmissions(): Promise<Submission[]> {
    return await db.select().from(submissions).orderBy(desc(submissions.submittedAt));
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const result = await db.select().from(submissions).where(eq(submissions.id, id));
    return result[0];
  }

  async getSubmissionByPhone(phone: string): Promise<Submission | undefined> {
    try {
      const result = await db.select().from(submissions).where(eq(submissions.phone, phone)).orderBy(desc(submissions.submittedAt));
      return result?.[0];
    } catch (error) {
      console.error("Error in getSubmissionByPhone:", error);
      return undefined;
    }
  }

  async getSubmissionByEmail(email: string): Promise<Submission | undefined> {
    try {
      const result = await db.select().from(submissions).where(eq(submissions.email, email)).orderBy(desc(submissions.submittedAt));
      return result?.[0];
    } catch (error) {
      console.error("Error in getSubmissionByEmail:", error);
      return undefined;
    }
  }

  async checkSubmissionDuplicates(email: string, phone: string): Promise<DuplicateCheckResult> {
    const rows = await db
      .select({ email: submissions.email, phone: submissions.phone })
      .from(submissions)
      .where(or(eq(submissions.email, email), eq(submissions.phone, phone)))
      .limit(2);
    return {
      emailExists: rows.some((r) => r.email === email),
      phoneExists: rows.some((r) => r.phone === phone),
    };
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const id = randomUUID();
    const [submission] = await db
      .insert(submissions)
      .values({ ...insertSubmission, id, submittedAt: new Date() })
      .returning();
    return submission;
  }

  async updateEligibilityScore(id: string, score: number): Promise<Submission | undefined> {
    const [submission] = await db
      .update(submissions)
      .set({ eligibilityScore: score })
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async updateSubmissionStatus(id: string, status: string): Promise<Submission | undefined> {
    const [submission] = await db
      .update(submissions)
      .set({ status })
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async getSpouseSubmissions(): Promise<SpouseSubmission[]> {
    return await db.select().from(spouseSubmissions).orderBy(desc(spouseSubmissions.submittedAt));
  }

  async getSpouseSubmission(id: string): Promise<SpouseSubmission | undefined> {
    const result = await db.select().from(spouseSubmissions).where(eq(spouseSubmissions.id, id));
    return result[0];
  }

  async getSpouseSubmissionByEmail(email: string): Promise<SpouseSubmission | undefined> {
    try {
      const result = await db.select().from(spouseSubmissions).where(eq(spouseSubmissions.email, email.toLowerCase())).orderBy(desc(spouseSubmissions.submittedAt));
      return result?.[0];
    } catch (error) {
      console.error("Error in getSpouseSubmissionByEmail:", error);
      return undefined;
    }
  }

  async getSpouseSubmissionByPhone(phone: string): Promise<SpouseSubmission | undefined> {
    try {
      const result = await db.select().from(spouseSubmissions).where(eq(spouseSubmissions.phone, phone)).orderBy(desc(spouseSubmissions.submittedAt));
      return result?.[0];
    } catch (error) {
      console.error("Error in getSpouseSubmissionByPhone:", error);
      return undefined;
    }
  }

  async checkSpouseSubmissionDuplicates(email: string, phone: string): Promise<DuplicateCheckResult> {
    const rows = await db
      .select({ email: spouseSubmissions.email, phone: spouseSubmissions.phone })
      .from(spouseSubmissions)
      .where(or(eq(spouseSubmissions.email, email), eq(spouseSubmissions.phone, phone)))
      .limit(2);
    return {
      emailExists: rows.some((r) => r.email === email),
      phoneExists: rows.some((r) => r.phone === phone),
    };
  }

  async createSpouseSubmission(insertSubmission: InsertSpouseSubmission): Promise<SpouseSubmission> {
    const id = randomUUID();
    const [submission] = await db
      .insert(spouseSubmissions)
      .values({ ...insertSubmission, id, submittedAt: new Date() })
      .returning();
    return submission;
  }

  async updateSpouseEligibilityScore(id: string, score: number): Promise<SpouseSubmission | undefined> {
    const [submission] = await db
      .update(spouseSubmissions)
      .set({ eligibilityScore: score })
      .where(eq(spouseSubmissions.id, id))
      .returning();
    return submission;
  }

  async createRefreshToken(insertToken: InsertRefreshToken): Promise<RefreshToken> {
    const id = randomUUID();
    const [token] = await db
      .insert(refreshTokens)
      .values({ ...insertToken, id, createdAt: new Date() })
      .returning();
    return token;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const result = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
    return result[0];
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    const now = new Date();
    await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, now));
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.submittedAt));
  }

  async createContactMessage(insertMessage: InsertContactMessage): Promise<ContactMessage> {
    const id = randomUUID();
    const [message] = await db
      .insert(contactMessages)
      .values({ ...insertMessage, id, submittedAt: new Date() })
      .returning();
    return message;
  }
}

export const storage = new DbStorage();
