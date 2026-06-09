import type { Response } from "express";
import { storage } from "../utilities/storage";
import { insertSubmissionSchema } from "@shared/schema";
import { z } from "zod";
import { calculateEligibilityScore } from "@shared/eligibilityCalculator";
import { sendSubmissionToGoogleSheets } from "../utilities/googleSheets";
import type { AuthRequest } from "../middleware/auth.middleware";

export async function getAllSubmissions(req: AuthRequest, res: Response) {
  try {
    const submissions = await storage.getSubmissions();
    res.json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
}

export async function getSubmissionById(req: AuthRequest, res: Response) {
  try {
    const submission = await storage.getSubmission(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.json(submission);
  } catch (error) {
    console.error("Error fetching submission by ID:", error);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
}

export async function getPublicSubmission(req: AuthRequest, res: Response) {
  try {
    const submission = await storage.getSubmission(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    
    const eligibilityResult = calculateEligibilityScore(submission);
    
    res.json({
      id: submission.id,
      eligibilityScore: submission.eligibilityScore,
      status: submission.status,
      submittedAt: submission.submittedAt,
      eligibilityDetails: eligibilityResult,
    });
  } catch (error) {
    console.error("Error fetching public submission:", error);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
}

// export async function createSubmission(req: AuthRequest, res: Response) {
//   try {
//     const validatedData = insertSubmissionSchema.parse(req.body);
    
//     // Normalize email to lowercase for consistent storage and duplicate checking
//     validatedData.email = validatedData.email.toLowerCase().trim();
    
//     const existingEmailSubmission = await storage.getSubmissionByEmail(validatedData.email);
//     if (existingEmailSubmission) {
//       return res.status(400).json({ error: "This email address has already been used for a submission" });
//     }
    
//     const existingPhoneSubmission = await storage.getSubmissionByPhone(validatedData.phone);
//     if (existingPhoneSubmission) {
//       return res.status(400).json({ error: "This phone number has already been used for a submission" });
//     }
    
//     const eligibilityResult = calculateEligibilityScore(validatedData);
    
//     const submission = await storage.createSubmission({
//       ...validatedData,
//       eligibilityScore: eligibilityResult.score,
//       status: eligibilityResult.isEligible ? "approved" : "pending",
//     });
    
//     if (!submission) {
//       return res.status(500).json({ error: "Failed to create submission" });
//     }
    
//     try {
//       await sendSubmissionToGoogleSheets(submission);
//     } catch (sheetsError) {
//       console.error("Failed to send to Google Sheets, but submission was saved:", sheetsError);
//     }
    
//     res.status(201).json(submission);
//   } catch (error) {
//     console.error("Error creating submission:", error);
//     if (error instanceof z.ZodError) {
//       return res.status(400).json({ error: "Invalid submission data" });
//     }
//     return res.status(500).json({ error: "Internal server error" });
//   }
// }

export async function createSubmission(req: AuthRequest, res: Response) {
  try {
    // Step 1: Validate input
    const validatedData = insertSubmissionSchema.parse(req.body);

    // Step 2: Normalize email
    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // Step 3: Duplicate check (single DB round-trip)
    const { emailExists, phoneExists } = await storage.checkSubmissionDuplicates(
      normalizedEmail,
      validatedData.phone,
    );

    if (emailExists) {
      return res.status(400).json({
        field: "email",
        message: "This email address has already been used for a submission"
      });
    }

    if (phoneExists) {
      return res.status(400).json({
        field: "phone",
        message: "This phone number has already been used for a submission"
      });
    }

    // Step 4: Calculate score
    const eligibility = calculateEligibilityScore(validatedData);

    // Step 5: Save to database
    const submission = await storage.createSubmission({
      ...validatedData,
      email: normalizedEmail,
      eligibilityScore: eligibility.score,
      status: eligibility.isEligible ? "approved" : "pending",
    });

    if (!submission) {
      return res.status(500).json({ error: "Failed to create submission" });
    }

    // Step 6: Push to Google Sheets (BACKGROUND)
    sendSubmissionToGoogleSheets(submission).catch((err) => {
      console.error("Google Sheets sync failed:", err);
    });

    // Step 7: Respond immediately ⚡
    return res.status(201).json({
      id: submission.id,
      message: "Submission created successfully",
    });

  } catch (error: any) {
    console.error("Error creating submission:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}


export async function updateSubmissionStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    const submission = await storage.updateSubmissionStatus(req.params.id, status);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.json(submission);
  } catch (error) {
    console.error("Error updating submission status:", error);
    res.status(500).json({ error: "Failed to update submission" });
  }
}

