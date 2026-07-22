import { google } from "googleapis";
import type { Submission, SpouseSubmission,ContactMessage } from "./../../shared/schema";

/* ---------------------------------------------------------
   GOOGLE AUTH USING JSON FROM ENV (Render Compatible)
--------------------------------------------------------- */


const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

function loadCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS);
  }

  // fallback for local development
  return require("./credentials.json");
}

function loadSpouseCredentials() {
  if (process.env.SPOUSE_GOOGLE_CREDENTIALS) {
    return JSON.parse(process.env.SPOUSE_GOOGLE_CREDENTIALS);
  }

  // fallback to main credentials if spouse-specific ones are not set
  return loadCredentials();
}

const auth = new google.auth.GoogleAuth({
  credentials: loadCredentials(),
  scopes: SHEETS_SCOPE,
});

const spouseAuth = new google.auth.GoogleAuth({
  credentials: loadSpouseCredentials(),
  scopes: SHEETS_SCOPE,
});

export async function getGoogleSheetClient() {
  return google.sheets({ version: "v4", auth });
}

export async function getSpouseGoogleSheetClient() {
  return google.sheets({ version: "v4", auth: spouseAuth });
}
/* ---------------------------------------------------------
   ENV VARIABLES
--------------------------------------------------------- */

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SPOUSE_SPREADSHEET_ID = process.env.SPOUSE_GOOGLE_SHEET_ID;
const CONTACT_SPREADSHEET_ID = process.env.GOOGLE_CONTACT_SHEET_ID;
const SPOUSE_SHEET_TAB = process.env.SPOUSE_GOOGLE_SHEET_TAB || "Sheet1";


/* ---------------------------------------------------------
   SUBMISSION → SEND TO GOOGLE SHEETS
--------------------------------------------------------- */
export async function sendSubmissionToGoogleSheets(
  submission: Submission
): Promise<void> {
  try {
    const sheets = await getGoogleSheetClient();

    const formattedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const row = [
      formattedDate,
      submission.id || "",
      submission.fullName || "",
      submission.email || "",
      submission.phone || "",
      submission.city || "",
      submission.education || "",
      submission.educationGrade || "",
      submission.gradeType || "",
      submission.hasLanguageTest || "",
      submission.languageTest || "",
      submission.ieltsScore || "",
      submission.courseRelevance || "",
      submission.courseType || "",
      submission.institutionType || "",
      submission.gapYears || "",
      submission.proofOfFunds || "",
      submission.strongSOP || "",
      submission.publicUniversityLOA || "",
      submission.hasWorkExperience || "",
      submission.workExperienceYears || "",
      submission.financialCapacity || "",
      submission.preferredIntake || "",
      submission.preferredProvince || "",
      submission.eligibilityScore?.toString() || "",
      submission.status || "",
    ];

    // Header check
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:Z1",
    });

    const expectedHeader = "Submission Date";
    const headersMissing =
      !headerResponse.data.values ||
      !headerResponse.data.values[0] ||
      headerResponse.data.values[0][0] !== expectedHeader;

    if (headersMissing) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "Submission Date",
              "ID",
              "Full Name",
              "Email",
              "Phone",
              "City",
              "Education",
              "Education Grade",
              "Grade Type",
              "Has Language Test",
              "Language Test",
              "IELTS Score",
              "Course Relevance",
              "Course Type",
              "Institution Type",
              "Gap Years",
              "Proof of Funds",
              "Strong SOP",
              "Public Uni LOA",
              "Has Work Experience",
              "Work Experience (Years)",
              "Financial Capacity",
              "Preferred Intake",
              "Preferred Province",
              "Eligibility Score",
              "Status",
            ],
          ],
        },
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:Z",
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });
  } catch (err) {
    console.error("❌ Google Sheets submission error:", err);
    throw err;
  }
}

export async function sendSpouseSubmissionToGoogleSheets(
  submission: SpouseSubmission
): Promise<void> {
  try {
    if (!SPOUSE_SPREADSHEET_ID) {
      throw new Error("SPOUSE_GOOGLE_SHEET_ID is not configured");
    }

    const sheets = await getSpouseGoogleSheetClient();
    const tab = SPOUSE_SHEET_TAB;

    const formattedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const values = [
      [
        formattedDate,
        submission.id || "",
        submission.fullName || "",
        submission.email || "",
        submission.phone || "",
        submission.city || "",
        submission.spouseName || "",
        submission.permitType || "",
        submission.durationInformation || "",
        submission.nocLevel || "",
        submission.canadaFunds || "",
        submission.indiaFunds || "",
        submission.credits || "",
        submission.marriageDuration || "",
        submission.eligibilityScore?.toString() || "",
        submission.status || "",
      ],
    ];

    // HEADER CHECK
    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId: SPOUSE_SPREADSHEET_ID,
      range: `'${tab}'!A1:P1`,
    });

    const expectedHeader = "Submission Date";
    const needsHeaders =
      !headerCheck.data.values ||
      !headerCheck.data.values[0] ||
      headerCheck.data.values[0][0] !== expectedHeader;

    if (needsHeaders) {
      const headers = [
        [
          "Submission Date",
          "Submission ID",
          "Full Name",
          "Email",
          "Phone",
          "City",
          "Spouse Name",
          "Permit Type",
          "Duration Information",
          "NOC Level",
          "Canada Funds",
          "India Funds",
          "Credits",
          "Marriage Duration",
          "Eligibility Score",
          "Status",
        ],
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPOUSE_SPREADSHEET_ID,
        range: `'${tab}'!A1`,
        valueInputOption: "RAW",
        requestBody: { values: headers },
      });
    }

    // APPEND ROW
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPOUSE_SPREADSHEET_ID,
      range: `'${tab}'!A:P`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    console.log("✅ Spouse submission saved:", submission.id);
  } catch (err) {
    console.error("❌ Error sending spouse submission:", err);
    throw err;
  }
}

export async function sendContactMessageToGoogleSheets(
  contact: ContactMessage
): Promise<void> {
  try {
    const sheets = await getGoogleSheetClient();

    const formattedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const row = [
      formattedDate,
      contact.name || "",
      contact.email || "",
      contact.phone || "",
      contact.subject || "",
      contact.message || "",
    ];

    // HEADER CHECK
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: CONTACT_SPREADSHEET_ID,
      range: "Sheet1!A1:F1",
    });

    const expectedHeader = "Submission Date";
    const headersMissing =
      !headerResponse.data.values ||
      !headerResponse.data.values[0] ||
      headerResponse.data.values[0][0] !== expectedHeader;

    if (headersMissing) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: CONTACT_SPREADSHEET_ID,
        range: "Sheet1!A1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "Submission Date",
              "Name",
              "Email",
              "Phone",
              "Subject",
              "Message",
            ],
          ],
        },
      });
    }

    // APPEND
    await sheets.spreadsheets.values.append({
      spreadsheetId: CONTACT_SPREADSHEET_ID,
      range: "Sheet1!A:F",
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });

    console.log("✅ Contact submission saved");
  } catch (err) {
    console.error("❌ Google Sheets contact submission error:", err);
    throw err;
  }
}