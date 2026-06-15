// Manager name → email, used to address feedback alerts.
//
// Why this exists: the Azure app registration lacks directory-read permission
// (User.Read.All), so manager emails can't be resolved from Microsoft Graph.
// Sending works (Mail.Send is granted), so we map the manager's name — exactly
// as it appears in the RMS "Manager Name" field — to their email here.
//
// Keys are matched case-insensitively with collapsed whitespace, so casing/extra
// spaces don't matter. Fill in the emails below; blank entries are treated as
// "no email on file" and the alert returns a clear message instead of failing.

const RAW: Record<string, string> = {
  "Tanya Jaiswal": "Tanya.Jaiswal@koenig-solutions.com",
  "Vibhor Raju Sharma": "Vibhor.Sharma@koenig-solutions.com",
  "Prashant Ranjan": "prashant.ranjan@koenig-solutions.com",
  "Hardik Ankush Tike": "hardik.tike@koenig-solutions.com",
  "Manish Chaturvedi": "manish.chaturvedi@koenig-solutions.com",
  "Rohit Aggarwal": "rohit.a@koenig-solutions.com",
  "Karishma Talreja": "karishma.talreja@koenig-solutions.com",
  "Rashi Oberoi": "rashi.oberoi@koenig-solutions.com",
  "Shubham Saha": "Shubham.Saha@koenig-solutions.com",
  "Vardaan Aggarwal": "vardaan.aggarwal@koenig-solutions.com",
  "Vatan": "vatan.joshi@koenig-solutions.com",
  "DEEPTI SHASTRI": "Deepti.Shastri@koenig-solutions.com",
  "Dinesh Ghanshyam Tiwari": "Dinesh.Tiwari@koenig-solutions.com",
  "Divya R": "Divya.R@koenig-solutions.com",
  "NIDHI KUMRA AHUJA": "nidhi.kumra@koenig-solutions.com",
  "Pooja Maheshwari": "Pooja.Maheshwari@koenig-solutions.com",
  "Rashmi Amol Dhumal": "Rashmi.Dhumal@koenig-solutions.com",
  "Raushan Ranjan": "Raushan.Ranjan@koenig-solutions.com",
  "Rimpy Srivastava": "rimpy.srivastava@koenig-solutions.com",
  "Sakshi Dhawan": "sakshi.dhawan@koenig-solutions.com",
  "Sandeep": "sandeep.singh@koenig-solutions.com",
  "Sandeep Joshi": "Sandeep.Joshi@koenig-solutions.com",
  "Sushma Sharma": "Sushma.Sharma@koenig-solutions.com",
  "AISHWAR C NIGAM": "Aishwar.C@koenig-solutions.com",
  "ARSHAD KAMAL": "Arshad.Kamal@koenig-solutions.com",
  "Abhishek": "", // ambiguous — abhishek.soni@ vs Abhishek.vidiyala@ ; please confirm which
  "Akash Mehndiratta": "akash.mehndiratta@koenig-solutions.com",
  "Anirudh Sharma": "Anirudh.Sharma@koenig-solutions.com",
  "Ankit Kumar Malik": "ankit.malik@koenig-solutions.com",
  "Ashwin": "Ashwin.koshy@koenig-solutions.com",
  "Dinesh Kumar Jha": "", // no matching email provided (Dinesh.Tiwari@ is Dinesh G. Tiwari)
  "Geetha M": "GEETHA.M@koenig-solutions.com",
  "IMRAN ALI M.R": "Imran.Ali@koenig-solutions.com",
  "Jasmeet Kaur": "jasmeet.kaur@koenig-solutions.com",
  "Jessica": "jessica@koenig-solutions.com",
  "KANNAN MANOHARAN": "Kannan.Manoharan@koenig-solutions.com",
  "Kannan S": "Kannan.Sudhakaran@koenig-solutions.com",
  "Megha Jain": "", // no "megha" email provided (megan@ is a different person); please confirm
  "Prabhat Singh": "prabhat.singh@koenig-solutions.com",
  "Prashant": "prashant.ranjan@koenig-solutions.com", // assumed same as "Prashant Ranjan"
  "Rimpy": "rimpy.srivastava@koenig-solutions.com",    // assumed same as "Rimpy Srivastava"
  "Rishika Tibarewala": "rishika.tibarewala@koenig-solutions.com",
  "Rohit Tiwary": "Rohit.Tiwary@koenig-solutions.com",
  "Sachin": "sachin.chauhan@koenig-solutions.com",
  "Sakshi Nagpal": "Sakshi.Nagpal@koenig-solutions.com",
  "Sania Mutreja": "Sania.Mutreja@koenig-solutions.com",
  "Saurabh Banerjee": "saurabh.banerjee@koenig-solutions.com",
  "Shruti Chhabra": "Shruti.Chhabra@koenig-solutions.com",
  "Steve": "Steve@koenig-solutions.com",
  "Subodh Chaudhary": "subodh.chaudhary@koenig-solutions.com",
  "Sunaina .": "", // no "sunaina" email provided; please confirm
  "Tarseel Bakhtiyar Kazmi": "Tarseel.Kazmi@koenig-solutions.com",
  "Vaibhav Gupta": "Vaibhav.Gupta@koenig-solutions.com",
  "Vandana Kurichh": "Vandana.Kurichh@koenig-solutions.com",
  "Vivek M Menon": "Vivek.Menon@koenig-solutions.com",
  "kajal bhagvandas ramnani": "Kajal.Ramnani@koenig-solutions.com",
};

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

const MAP = new Map(
  Object.entries(RAW)
    .filter(([, email]) => email.trim())
    .map(([name, email]) => [normalize(name), email.trim()])
);

// Returns the manager's email if one is on file, else null.
export function getManagerEmail(name: string): string | null {
  return MAP.get(normalize(name)) ?? null;
}
