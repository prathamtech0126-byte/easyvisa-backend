import type { Request, Response } from "express";
import { storage } from "../utilities/storage";
import { insertSpouseSubmissionSchema } from "@shared/schema";
import { calculateSpouseEligibilityScore } from "@shared/spouseEligibilityCalculator";
import { sendSpouseSubmissionToGoogleSheets } from "../utilities/googleSheets";
import type { AuthRequest } from "../middleware/auth.middleware";

export async function checkDuplicates(req: Request, res: Response) {
  try {
    const { email, phone } = req.body;
    const errors: { field: string; message: string }[] = [];

    if (email && phone) {
      const normalizedEmail = email.toLowerCase().trim();
      const { emailExists, phoneExists } = await storage.checkSpouseSubmissionDuplicates(
        normalizedEmail,
        phone,
      );
      if (emailExists) {
        errors.push({
          field: "email",
          message: "This email has already been used for a submission",
        });
      }
      if (phoneExists) {
        errors.push({
          field: "phone",
          message: "This phone number has already been used for a submission",
        });
      }
    } else if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingByEmail = await storage.getSpouseSubmissionByEmail(normalizedEmail);
      if (existingByEmail) {
        errors.push({
          field: "email",
          message: "This email has already been used for a submission",
        });
      }
    } else if (phone) {
      const existingByPhone = await storage.getSpouseSubmissionByPhone(phone);
      if (existingByPhone) {
        errors.push({
          field: "phone",
          message: "This phone number has already been used for a submission",
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error("Error checking duplicates:", error);
    res.status(500).json({ error: "Failed to check duplicates" });
  }
}

export async function checkEmailDuplicate(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingByEmail = await storage.getSpouseSubmissionByEmail(normalizedEmail);
    
    if (existingByEmail) {
      return res.status(400).json({ 
        field: "email",
        message: "This email has already been used for a submission" 
      });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error("Error checking email duplicate:", error);
    res.status(500).json({ error: "Failed to check email" });
  }
}

export async function checkPhoneDuplicate(req: Request, res: Response) {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone is required" });
    }

    const existingByPhone = await storage.getSpouseSubmissionByPhone(phone);
    
    if (existingByPhone) {
      return res.status(400).json({ 
        field: "phone",
        message: "This phone number has already been used for a submission" 
      });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error("Error checking phone duplicate:", error);
    res.status(500).json({ error: "Failed to check phone" });
  }
}

// export async function createSpouseSubmission(req: Request, res: Response) {
//   try {
//     const validatedData = insertSpouseSubmissionSchema.parse(req.body);
    
//     const normalizedEmail = validatedData.email.toLowerCase().trim();
    
//     const errors: { field: string; message: string }[] = [];
    
//     const existingByEmail = await storage.getSpouseSubmissionByEmail(normalizedEmail);
//     if (existingByEmail) {
//       errors.push({
//         field: "email",
//         message: "This email has already been used for a submission"
//       });
//     }
    
//     const existingByPhone = await storage.getSpouseSubmissionByPhone(validatedData.phone);
//     if (existingByPhone) {
//       errors.push({
//         field: "phone",
//         message: "This phone number has already been used for a submission"
//       });
//     }
    
//     if (errors.length > 0) {
//       return res.status(400).json({ errors });
//     }
    
//     const submission = await storage.createSpouseSubmission({
//       ...validatedData,
//       email: normalizedEmail,
//     });
    
//     const eligibilityResult = calculateSpouseEligibilityScore(submission);
    
//     await storage.updateSpouseEligibilityScore(submission.id, eligibilityResult.score);
    
//     const updatedSubmission = await storage.getSpouseSubmission(submission.id);
//     if (updatedSubmission) {
//       sendSpouseSubmissionToGoogleSheets(updatedSubmission).catch((err) => {
//         console.error("Failed to send spouse submission to Google Sheets:", err);
//       });
//     }
    
//     res.status(201).json({
//       id: submission.id,
//       message: "Spouse visa submission created successfully",
//     });
//   } catch (error: any) {
//     console.error("Error creating spouse submission:", error);
    
//     if (error.name === "ZodError") {
//       return res.status(400).json({ 
//         error: "Validation failed", 
//         details: error.errors 
//       });
//     }
    
//     res.status(500).json({ error: "Failed to create submission" });
//   }
// }

export async function createSpouseSubmission(req: Request, res: Response) {
  try {
    const validatedData = insertSpouseSubmissionSchema.parse(req.body);

    const normalizedEmail = validatedData.email.toLowerCase().trim();
    const errors: { field: string; message: string }[] = [];

    const { emailExists, phoneExists } = await storage.checkSpouseSubmissionDuplicates(
      normalizedEmail,
      validatedData.phone,
    );

    if (emailExists) {
      errors.push({ field: "email", message: "This email has already been used for a submission" });
    }
    if (phoneExists) {
      errors.push({ field: "phone", message: "This phone number has already been used for a submission" });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const eligibilityResult = calculateSpouseEligibilityScore({
      ...validatedData,
      email: normalizedEmail,
    });

    const submission = await storage.createSpouseSubmission({
      ...validatedData,
      email: normalizedEmail,
      eligibilityScore: eligibilityResult.score,
    });

    sendSpouseSubmissionToGoogleSheets(submission).catch((err) => {
      console.error("Failed to send spouse submission to Google Sheets:", err);
    });

    res.status(201).json({
      id: submission.id,
      message: "Spouse visa submission created successfully",
    });

  } catch (error: any) {
    console.error("Error creating spouse submission:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }

    res.status(500).json({ error: "Failed to create submission" });
  }
}


export async function getPublicSpouseSubmission(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const submission = await storage.getSpouseSubmission(id);
    
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    
    const eligibilityResult = calculateSpouseEligibilityScore(submission);
    
    res.json({
      id: submission.id,
      fullName: submission.fullName,
      email: submission.email,
      eligibilityScore: submission.eligibilityScore,
      eligibilityDetails: eligibilityResult,
      submittedAt: submission.submittedAt,
    });
  } catch (error) {
    console.error("Error fetching spouse submission:", error);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
}

export async function getAllSpouseSubmissions(req: AuthRequest, res: Response) {
  try {
    const submissions = await storage.getSpouseSubmissions();
    res.json(submissions);
  } catch (error) {
    console.error("Error fetching spouse submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
}

export async function getSpouseSubmissionById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const submission = await storage.getSpouseSubmission(id);
    
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    
    const eligibilityResult = calculateSpouseEligibilityScore(submission);
    
    res.json({
      ...submission,
      eligibilityDetails: eligibilityResult,
    });
  } catch (error) {
    console.error("Error fetching spouse submission:", error);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
}
