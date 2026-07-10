// /**
//  * Seeds two demo workspaces (per project deliverables):
//  *  - "Demo E-commerce Store"
//  *  - "Demo SaaS Company"
//  * Run with: npm run seed
//  */

// const bcrypt = require("bcryptjs");
// require("dotenv").config();
// const connectDB = require("../config/db");
// const User = require("../models/User");
// const Workspace = require("../models/Workspace");
// const KnowledgeDoc = require("../models/KnowledgeDoc");
// const { chunkText, embedChunks } = require("../services/embeddingService");

// const demoData = [
//   {
//     ownerName: "Ayesha Khan",
//     ownerEmail: "owner@demoecommerce.com",
//     password: "password123",
//     workspaceName: "Demo E-commerce Store",
//     kb: `Shipping: We ship within Pakistan in 2-4 business days and internationally in 7-14 business days.
// Returns: Items can be returned within 30 days of delivery for a full refund if unused and in original packaging.
// Payment: We accept credit/debit cards, JazzCash, EasyPaisa, and cash on delivery.
// Order tracking: You can track your order using the tracking link sent to your email after dispatch.`,
//   },
//   {
//     ownerName: "James Carter",
//     ownerEmail: "owner@demosaas.com",
//     password: "password123",
//     workspaceName: "Demo SaaS Company",
//     kb: `Pricing: We offer Free, Pro ($29/mo), and Enterprise (custom) plans, billed monthly or annually.
// Support hours: Live chat support is available 9am-6pm GMT, Monday to Friday.
// Cancellation: You can cancel anytime from Settings > Billing; you retain access until the end of the billing period.
// API access: API access is available on Pro and Enterprise plans with rate limits of 1000 and 10000 requests/day respectively.`,
//   },
// ];

// async function seed() {
//   await connectDB();

//   for (const item of demoData) {
//     let user = await User.findOne({ email: item.ownerEmail });
//     if (!user) {
//       user = await User.create({ name: item.ownerName, email: item.ownerEmail, password: item.password, role: "business_owner" });
//     }

//     let workspace = await Workspace.findOne({ ownerId: user._id });
//     if (!workspace) {
//       workspace = await Workspace.create({ name: item.workspaceName, ownerId: user._id });
//       user.workspaceId = workspace._id;
//       await user.save();
//     }

//     const existingDoc = await KnowledgeDoc.findOne({ workspaceId: workspace._id });
//     if (!existingDoc) {
//       const chunks = chunkText(item.kb, 300, 50);
//       const vectors = await embedChunks(chunks);
//       await KnowledgeDoc.create({
//         workspaceId: workspace._id,
//         filename: "seed-faq.txt",
//         sourceType: "text",
//         rawText: item.kb,
//         chunks: chunks.map((text, i) => ({ text, embedding: vectors[i] })),
//         status: "ready",
//       });
//     }

//     console.log(`✅ Seeded workspace "${workspace.name}" (login: ${item.ownerEmail} / ${item.password})`);
//   }

//   console.log("Done seeding.");
//   process.exit(0);
// }

// seed().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });





/**
 * Seeds two demo workspaces (per project deliverables):
 *  - "Demo E-commerce Store"
 *  - "Demo SaaS Company"
 * Run with: npm run seed
 */

require("dotenv").config();

const connectDB = require("../config/db");
const User = require("../models/User");
const Workspace = require("../models/Workspace");
const KnowledgeDoc = require("../models/KnowledgeDoc");
const { chunkText, embedChunks } = require("../services/embeddingService");
const bcrypt = require("bcryptjs");   // <-- ADD THIS LINE

const demoData = [
  {
    ownerName: "Ayesha Khan",
    ownerEmail: "owner@demoecommerce.com",
    password: "password123",
    workspaceName: "Demo E-commerce Store",
    kb: `Shipping: We ship within Pakistan in 2-4 business days and internationally in 7-14 business days.
Returns: Items can be returned within 30 days of delivery for a full refund if unused and in original packaging.
Payment: We accept credit/debit cards, JazzCash, EasyPaisa, and cash on delivery.
Order tracking: You can track your order using the tracking link sent to your email after dispatch.`,
  },
  {
    ownerName: "James Carter",
    ownerEmail: "owner@demosaas.com",
    password: "password123",
    workspaceName: "Demo SaaS Company",
    kb: `Pricing: We offer Free, Pro ($29/mo), and Enterprise (custom) plans, billed monthly or annually.
Support hours: Live chat support is available 9am-6pm GMT, Monday to Friday.
Cancellation: You can cancel anytime from Settings > Billing; you retain access until the end of the billing period.
API access: API access is available on Pro and Enterprise plans with rate limits of 1000 and 10000 requests/day respectively.`,
  },
];


async function seed() {
  await connectDB();

  for (const item of demoData) {

    let user = await User.findOne({ email: item.ownerEmail });

    if (!user) {

      // CREATE HASHED PASSWORD HERE
      const hashedPassword = await bcrypt.hash(item.password, 10);

      user = await User.create({
        name: item.ownerName,
        email: item.ownerEmail,
        password: hashedPassword,
        role: "business_owner"
      });

    }


    let workspace = await Workspace.findOne({ ownerId: user._id });

    if (!workspace) {

      workspace = await Workspace.create({
        name: item.workspaceName,
        ownerId: user._id
      });

      user.workspaceId = workspace._id;
      await user.save();

    }


    const existingDoc = await KnowledgeDoc.findOne({
      workspaceId: workspace._id
    });


    if (!existingDoc) {

      const chunks = chunkText(item.kb, 300, 50);

      const vectors = await embedChunks(chunks);

      await KnowledgeDoc.create({
        workspaceId: workspace._id,
        filename: "seed-faq.txt",
        sourceType: "text",
        rawText: item.kb,
        chunks: chunks.map((text, i) => ({
          text,
          embedding: vectors[i]
        })),
        status: "ready",
      });

    }


    console.log(
      `✅ Seeded workspace "${workspace.name}" (login: ${item.ownerEmail} / ${item.password})`
    );

  }


  console.log("Done seeding.");
  process.exit(0);
}


seed().catch((err) => {
  console.error(err);
  process.exit(1);
});