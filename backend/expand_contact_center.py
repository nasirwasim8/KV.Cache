#!/usr/bin/env python3
"""
Appends 6 new enterprise sections to the Contact Center system prompt in routes.py.
Inserts the new content right before the closing triple-quote of the contact_center system_prompt.
"""

ROUTES_FILE = "/home/nwasim/projects/ddn-kv-cache/backend/app/api/routes.py"

NEW_SECTIONS = '''

=============================================================
SECTION 19: BSA/AML COMPLIANCE — FULL AGENT REFERENCE GUIDE
=============================================================
The Bank Secrecy Act (BSA) and Anti-Money Laundering (AML) regulations require Apex Financial Services to detect, prevent, and report suspicious financial activity. Agents are a critical first line of defense. Every agent must complete annual BSA/AML certification. Failure to follow these procedures can result in individual civil monetary penalties up to $1,000,000 per violation.

CURRENCY TRANSACTION REPORTS (CTR):
- Required for any cash transaction (in or out) exceeding $10,000 in a single business day
- Includes aggregated cash transactions: if a customer deposits $6,000 in the morning and $5,000 in the afternoon, a CTR is required for that day
- CTR must be filed within 15 calendar days of the transaction
- Do NOT inform the customer that a CTR is being filed — this is not prohibited but is strongly discouraged per FinCEN guidance
- Structuring: It is ILLEGAL for a customer to deliberately break transactions below $10,000 to avoid CTR reporting. If you observe or suspect structuring, immediately alert your supervisor and the BSA Officer. Do not confront the customer.
- CTR exceptions: Federal agencies, state/local governments, publicly traded companies, and certain financial institutions are exempt. Maintain the Exempt Person list in the BSA portal.
- ALWAYS file even if you believe it was an innocent transaction — the threshold is objective, not intent-based.

SUSPICIOUS ACTIVITY REPORTS (SAR):
A SAR must be filed when a transaction involves $5,000 or more (or any amount if terrorism is suspected) AND the bank knows, suspects, or has reason to suspect that: (a) the transaction involves funds from illegal activity; (b) the transaction is designed to evade CTR requirements (structuring); (c) the transaction appears to serve no legitimate business purpose; or (d) the transaction involves the use of the bank to facilitate criminal activity.

SAR Indicators — Red Flags Every Agent Must Know:
- Customer refuses to provide ID or provides inconsistent information
- Customer is unusually nervous, evasive, or asks about reporting thresholds
- Customer makes large cash deposits immediately followed by wire transfers to foreign accounts
- Multiple individuals depositing similar amounts into the same account on the same day (smurfing)
- Customer deposits large cash amounts inconsistent with their stated business or personal income
- Accounts that receive large incoming wires and immediately send smaller wires to multiple accounts (layering)
- Customers who request information about structuring laws or CTR exemptions
- Round-number transactions ($10,000, $50,000, $100,000) with no apparent business purpose
- Dormant accounts that suddenly receive large transactions after months of no activity
- Transactions involving countries designated as high-risk by FATF (Financial Action Task Force)
- Cryptocurrency exchanges requesting wire transfers with unusually high frequency
- Customer provides false or misleading information about the nature or purpose of a transaction

SAR Filing Procedure:
Step 1: Document all observations in secure BSA notes only — never in standard CRM notes visible to all agents
Step 2: Report immediately to your BSA Liaison or branch BSA Officer — do not delay, even by one business day
Step 3: BSA Officer has 30 calendar days to file SAR with FinCEN (60 days if no suspect identified)
Step 4: SAR is strictly confidential — NEVER disclose to the customer, any unauthorized third party, or other bank employees who do not have a documented need to know. Tipping off a customer about a SAR filing is a federal crime punishable by up to 5 years imprisonment.

OFAC SANCTIONS COMPLIANCE:
The Office of Foreign Assets Control (OFAC) prohibits transactions with sanctioned individuals, entities, and countries. OFAC screening is automated in our core banking system, but agents must understand their role when a transaction or customer is flagged:
- Do NOT process the transaction — freeze it in the system
- Immediately alert the BSA/Compliance Officer (ext. 5-BSA)
- Do not notify the customer of the reason beyond: "we need to review this transaction with our compliance team"
- OFAC violations carry civil penalties up to $1,000,000 per transaction and potential criminal prosecution
- Current sanctioned programs (as of 2026): Cuba, Iran, North Korea, Russia (energy and defense sectors), Syria, Venezuela (state oil sector), Belarus, Balkans, Burma, Congo, Somalia, Sudan, Zimbabwe, and named SDNs (Specially Designated Nationals)
- The SDN list is updated daily — our system automatically screens against the most current version

CUSTOMER DUE DILIGENCE (CDD) AND ENHANCED DUE DILIGENCE (EDD):
CDD Required for ALL new accounts:
1. Verify customer identity: full legal name, date of birth, residential address, SSN or TIN
2. Understand the nature and purpose of the account: personal use, business, investment, etc.
3. Assess expected account activity: approximate monthly transaction volume and types
4. Document in New Account CDD checklist in the core banking system

Beneficial Ownership Rule — Required for All Legal Entity Customers (businesses, LLCs, trusts, etc.):
- Identify and verify ALL individuals who own 25% or more of the legal entity
- Identify ONE individual with significant managerial control (CEO, CFO, managing member, general partner)
- Collect from each beneficial owner: full legal name, date of birth, current address, SSN/passport/TIN, country of citizenship, percentage of ownership
- Beneficial ownership form must be signed and retained in the document management system

Enhanced Due Diligence (EDD) is required when a customer is identified as:
- A Politically Exposed Person (PEP): current or former senior foreign government official, their immediate family members, or close associates who may have access to public funds
- Resident of or conducting business with a high-risk jurisdiction per FATF or FinCEN guidance
- Operating as a Money Services Business (MSB): check cashers, currency exchangers, money transmitters, prepaid card issuers
- A customer with a complex or unusual ownership structure that makes it difficult to identify beneficial owners
- A customer with any prior SAR filing in our system or flagged through industry databases (e.g., SARS, LEXIS NEXIS, Transunion Fraud Shield)

EDD Process: Enhanced profile review by BSA team; documented risk rating (Low/Medium/High/Prohibited); senior management sign-off for High; 6-month review cycle for High-risk accounts; annual review for Medium-risk.

TRANSACTION MONITORING SYSTEM (TMS) ALERT HANDLING:
Our automated TMS generates alerts for unusual patterns. When you receive a TMS alert in your work queue:
1. Review the customer's complete recent transaction history (last 90 days minimum)
2. Check for any prior BSA notes, SAR filings, or previous alerts on this account
3. If the transaction has a clear, documented legitimate explanation (sale of home, business payroll, inheritance): document the full explanation in BSA notes with supporting details and close the alert with reason code "Documented Legitimate Activity"
4. If the explanation is unclear, inconsistent, or suspicious: escalate to BSA team immediately — NEVER close an unresolved alert without supervisor review and documented justification
5. TMS alerts must be resolved within 5 business days of generation. Overdue alerts are tracked and reported to the BSA Officer weekly.

=============================================================
SECTION 20: REGULATION E — ELECTRONIC FUND TRANSFER ACT — VERBATIM AGENT SCRIPTS
=============================================================
Regulation E protects consumers in electronic fund transfers including debit card transactions, ATM withdrawals, ACH (automated clearing house) transfers, and pre-authorized debits. Understanding these rights is essential because incorrect handling creates regulatory liability for Apex.

UNAUTHORIZED TRANSACTION LIABILITY WINDOWS:
- Reported within 2 business days of learning of loss: Maximum customer liability is $50
- Reported 2-60 days after the statement was sent: Maximum customer liability is $500
- Reported more than 60 days after statement: Customer may be liable for the full amount of unauthorized transfers occurring after the 60-day period (unlimited liability)
- APEX ENHANCED POLICY: As a goodwill measure and to remain competitive, Apex will cover unauthorized transactions reported within 120 days of the transaction date, subject to investigation findings. This policy exceeds federal requirements.

VERBATIM SCRIPT — Opening a Debit Card Unauthorized Transaction Dispute:
"Thank you for letting us know about this, [Customer Name]. I want to help you resolve this as quickly as possible.

To open a dispute, I'll need to verify some information about the transaction you're reporting as unauthorized. Can you confirm:
First, the date the transaction posted to your account.
Second, the merchant name or description as it appears on your statement.
Third, the exact transaction amount.

[After customer confirms]

I'm opening a dispute case for you right now. Your case number is [read from system] — please write this down for your records.

Here is exactly what happens next:
We will issue a provisional credit to your account within 5 business days. This credit goes into your account while we investigate. Our disputes team will then investigate the claim. By federal law, we have 45 business days to complete the investigation — or up to 90 business days if this involves a point-of-sale transaction or if your account is less than 30 days old.

If we determine the transaction was unauthorized, the provisional credit becomes permanent and you will not owe anything.
If we determine the transaction was in fact authorized, we are required to notify you in writing at least 5 business days before reversing the provisional credit. That gives you an opportunity to review our findings and provide any additional information.

You will receive written confirmation of this dispute opening within 3 business days by the communication method you prefer — would you like that sent to your email on file, [email], or by US Mail?"

VERBATIM SCRIPT — ATM Dispute (Customer Did Not Receive Cash):
"I completely understand, and I want to get this resolved for you immediately.

For an ATM cash-not-received dispute, here is what I am doing right now: I am opening a formal ATM dispute for $[amount] on [date].

A provisional credit of $[amount] will be applied to your account within 10 business days from today.

Here is what happens on our end: We contact the ATM operator — in this case [operator name if known] — and request the ATM balance reconciliation records and any available security footage for that transaction. If it was an Apex-owned ATM, we typically resolve this within 5 business days. For a third-party ATM, we depend on the cooperation of that operator, so it can take up to 45 business days.

Your case number is [read from system]. You will receive email updates at [email on file] as we have new information. Is there anything else I can help you with today?"

PRE-AUTHORIZED DEBIT STOP PAYMENT:
- Customer can stop a pre-authorized recurring debit (ACH) by notifying the bank orally or in writing at least 3 business days before the scheduled transfer date
- Bank may require written confirmation within 14 calendar days of the oral stop payment — if customer fails to provide written confirmation and the bank requires it, the oral stop payment is no longer binding
- Stop payment fee: $30 per individual stop payment order
- Standing stop payment orders (blocking all future debits from the same originator): $30; expires after 14 months and must be renewed
- Stopping payment at the bank does NOT cancel the underlying contract with the merchant — customer is responsible for notifying the merchant as well
- If bank fails to execute a valid stop payment order and the transfer goes through anyway, the bank must refund the amount and any resulting fees

REGULATION E ERROR RESOLUTION TIMEFRAMES — COMPLETE REFERENCE TABLE:
Standard debit transaction dispute: 45 business days to investigate; 10 business days to issue provisional credit
Point-of-sale (POS) debit transaction: 90 business days to investigate; 5 business days to issue provisional credit
Account open less than 30 days: 90 business days; 20 business days provisional credit
Foreign-initiated transaction: 90 business days; 10 business days provisional credit
ATM cash not dispensed: 10 business days both investigation and provisional credit
ACH unauthorized debit: 45 business days; 10 business days provisional credit
Note: "Business days" for Regulation E purposes excludes Saturdays, Sundays, and federal public holidays.

=============================================================
SECTION 21: COMPLETE FEE WAIVER AUTHORITY MATRIX — 2026 POLICY
=============================================================
The fee waiver authority matrix defines exactly which fees agents at each service level can waive without additional approval. Exceeding your authorization level without documented supervisor approval is a policy violation that will result in a quality score deduction and may result in formal corrective action.

FRONT-LINE AGENT AUTHORITY (Level 1 — no supervisor required):
Monthly maintenance fee waiver: 1 waiver per account per rolling 12-month period
Overdraft fee reversal: Up to 2 per account per rolling 12-month period; account must be in good standing (no more than 1 prior NSF in 90 days) for at least 90 days
Non-Apex ATM fee reversal: Up to 2 per account per rolling 12-month period
Credit card late payment fee: 1 waiver per account per rolling 12-month period; only for accounts with no prior late payments in 12 months (first-time courtesy only)
Returned item / NSF fee: 1 per account per rolling 12-month period
Paper statement fee: 1 per account per calendar year
Safe deposit box late fee: 1 waiver per year for accounts in good standing
NOT authorized without supervisor: Wire transfer fees, stop payment fees, CD early withdrawal penalties, annual credit card fee, overdraft protection transfer fee above policy limits

SENIOR AGENT AUTHORITY (Level 2+ or agents with 2+ years of continuous service):
All front-line agent authority plus the following additional waivers:
Monthly maintenance fee: Up to 3 per account per rolling 12-month period (any reason)
Overdraft fee reversal: Up to 4 per account per rolling 12-month period
Non-Apex ATM fee reversal: Up to 4 per account per rolling 12-month period
Domestic wire transfer fee: 1 waiver per account per rolling 12-month period (for relationship customers with 24+ months tenure)
Stop payment fee: 1 waiver per account per rolling 12-month period (for first-time requests)
Annual credit card fee: Up to 50% waiver for documented retention purpose (customer must be threatening to close account)
Expedited card replacement fee: 1 waiver per account per calendar year
International wire fee reduction: May reduce international wire from $45 to $25 for Premier customers (not a full waiver)

SUPERVISOR AUTHORITY (Team Lead, Floor Supervisor, and above):
All senior agent authority plus the following:
Monthly maintenance fee: No limit within a 12-month period when accompanied by documented hardship or documented service failure
Overdraft fee reversal: Up to 8 per account per rolling 12-month period; up to 12 with Director pre-approval
Overdraft protection transfer fee: May waive up to 4 per rolling 12-month period
Early CD withdrawal penalty: Full waiver for documented hardship (one-time per hardship event per customer lifetime; second occurrence requires Director approval)
Wire transfer fee: Multiple waivers for Priority and Premier relationship customers with $100,000+ in combined relationship value
Annual credit card fee: Full waiver for retention on accounts with 24+ months tenure and good payment history
Foreign transaction fee: Goodwill waiver up to $50 total per incident for documented system errors or processing failures

DIRECTOR / BRANCH MANAGER AUTHORITY:
All supervisor authority plus: unlimited discretion on fee waivers within regulatory and board policy limits; authority to approve courtesy credits up to $500; approval for second-occurrence CD penalty waivers; approval for overrides of automated denial decisions in limited cases

FEE WAIVER DOCUMENTATION REQUIREMENTS — MANDATORY FOR ALL LEVELS:
Every single fee waiver, regardless of amount, must be documented in the CRM system within 5 minutes of the call completion. Required fields:
- Fee type (exact description from drop-down menu — do not use free text)
- Fee amount waived (specific dollar amount)
- Reason code (select one): Customer Loyalty | Hardship | Service Recovery | Retention | Error Correction | First-Time Courtesy | Regulatory Requirement | Supervisor Override
- Brief justification in notes field (minimum 25 words explaining why waiver was appropriate)
- Agent ID (auto-populates)
- Supervisor approval ID (required if waiver exceeds your authority level)
- Supervisor approval must be documented in the call notes as: "Supervisor [name/ID] approved waiver of $[amount] for [fee type] on [date]"
Failure to document any waiver within the session is a compliance violation that affects both your individual quality score and is tracked for branch audit purposes.

=============================================================
SECTION 22: ZELLE AND DIGITAL PAYMENT DISPUTE PROCEDURES
=============================================================
Zelle is a real-time peer-to-peer payment network operated by Early Warning Services LLC (a consortium of major US banks including Apex). Unlike credit card chargebacks or check stop payments, the vast majority of Zelle transactions CANNOT be reversed once funds are transferred. This distinction creates significant customer expectation misalignment and requires careful, empathetic communication.

REGULATORY FRAMEWORK: Zelle transactions are governed by Regulation E (Electronic Fund Transfer Act) when they qualify as unauthorized electronic fund transfers.

AUTHORIZED VS UNAUTHORIZED — THE CRITICAL DISTINCTION:

COVERED UNDER REGULATION E (bank must investigate and may be required to reimburse):
- Account takeover (ATO): Fraudster gained unauthorized access to the customer's Apex online account or mobile app and initiated the Zelle transfer without the customer's knowledge or participation
- Technical errors: Bank system errors that caused duplicate transfers or incorrect amounts
- Transfers initiated by someone other than the authorized account holder or their authorized representative

NOT COVERED UNDER REGULATION E (customer authorized the transfer):
- Customer was deceived into authorizing the transfer voluntarily, even under false pretenses
- The account holder initiated the transfer themselves
- Common scenarios that are technically "authorized" and therefore not covered by Reg E: marketplace scams (paid for item that never arrived), romance scams (sent money to online relationship), grandparent scams (sent money believing grandchild needed bail), prize/lottery scams (paid upfront fees for non-existent prize), tech support scams (allowed remote access and payment)

APEX ENHANCED VOLUNTARY REIMBURSEMENT POLICY (effective January 2024, following Congressional pressure):
Despite the Regulation E distinction, Apex has adopted the following enhanced voluntary policies to remain industry-competitive and reduce regulatory scrutiny:

Policy 1 — Bank Impersonation Scams: When a fraudster contacts the customer and falsely claims to be an Apex employee or Apex's fraud department, and the customer sends Zelle as a direct result of this deception, this qualifies for impersonation scam review regardless of the Regulation E authorized/unauthorized distinction. Escalate ALL impersonation scam cases to the Fraud team (ext. 5-FRAUD) for case-by-case review. Do not promise reimbursement — promise a review.

Policy 2 — Government Impersonation Scams: When a fraudster claims to be from the IRS, Social Security Administration, FBI, or other government agency, the same escalation and review process applies.

Policy 3 — First-Time Victim Goodwill Program: For customers who are first-time scam victims, acted in good faith, and the loss is $500 or less, agents may submit a goodwill reimbursement request for supervisor review. Supervisor has authority to approve goodwill reimbursement up to $500. This is not a guarantee — it is a review process.

VERBATIM SCRIPT FOR ZELLE SCAM CALLS (Authorized Payment):
"I'm so sorry this happened to you, [Customer Name]. I want to take a moment to explain exactly where we are and what options we have, because I want to be completely transparent with you.

The Zelle transfer that went out — our records show that transfer was initiated from your account using your credentials. Under federal banking regulations, when the account holder authorizes a transfer — even when the person on the receiving end lied about who they were — that creates a very different legal situation than if someone hacked your account and sent it without your knowledge.

I know that feels unfair, and I understand. Here is what we can actually do for you:

First, can you tell me: did the person who contacted you claim to be from Apex Bank or from a government agency like the IRS or Social Security? [If yes]: That is a specific type of fraud called impersonation fraud, and we have a special review process for exactly this situation. I'm going to escalate this to our Fraud team, who will review your case for possible reimbursement. I cannot promise you the outcome, but I can promise this will get a full review by a specialist.

Second, regardless of the outcome with us: I strongly recommend you file a report right now at ReportFraud.ftc.gov — that is the Federal Trade Commission's fraud reporting website. Also file a report with your local police department. These reports create official records that can sometimes assist in recovery and also help protect other people from the same scam.

Third, I am going to flag the receiving account on our end and report it to Zelle directly, which will block the recipient from using Zelle and may help if that person tries to scam others.

Your case reference number is [number]. You will hear from our Fraud team within 3 business days if you qualify for the impersonation review process."

ZELLE TRANSFER LIMITS COMPLETE TABLE:
Apex Essentials Checking: Per-transaction $2,500 | Daily $2,500 | 30-day rolling $10,000
Apex Advantage Checking: Per-transaction $5,000 | Daily $5,000 | 30-day rolling $25,000
Apex Premier Checking: Per-transaction $10,000 | Daily $10,000 | 30-day rolling $50,000
Apex Student Checking: Per-transaction $500 | Daily $500 | 30-day rolling $2,000
Apex Business Essentials: Per-transaction $15,000 | Daily $15,000 | 30-day rolling $60,000
Apex Business Advantage: Per-transaction $25,000 | Daily $25,000 | 30-day rolling $100,000

Zelle limits are set at the network level and cannot be increased under any circumstances, including for Premier relationship customers. For customers needing to send amounts exceeding Zelle limits, the appropriate alternative is a wire transfer. Domestic wire: free for Advantage and Premier customers, $25 for Essentials customers.

=============================================================
SECTION 23: COMPLIANCE Q&A — MOST COMMON AGENT QUESTIONS
=============================================================
The following Q&A addresses the compliance situations agents encounter most frequently. These answers represent official Apex policy as of Q3 2026.

Q: A customer asks why their account is restricted. Can I tell them the specific reason?
A: You may confirm that there is a restriction on the account and that they need to work with us to resolve it. You may NOT reveal if the restriction is related to a SAR filing, an OFAC flag, a fraud investigation, or any law enforcement hold. If pressed: "I'm not able to share the specific reason for the restriction, but I can transfer you to our Account Review team who has the authority to assist you further." Never say "we filed a SAR" or "your name appeared on a sanctions list" or "law enforcement placed a hold."

Q: A customer is depositing $9,500 in cash and jokes that they are trying to "stay under the limit." What do I do?
A: Do not process the transaction. Structuring is a federal crime under 31 U.S.C. 5324, even if the customer says it as a joke or says they were unaware it was illegal. Politely excuse yourself ("I need to speak with my supervisor for a moment") and immediately alert your BSA Liaison. Complete a SAR. Do not inform the customer that a SAR is being filed. Do not complete the transaction without supervisor direction. If the customer becomes agitated, remain calm and professional.

Q: A customer wants to make a large cash withdrawal. Do I have to report it?
A: Cash withdrawals of more than $10,000 in a single business day are reported on a CTR exactly the same as deposits. Process the transaction normally for legitimate customers. File the CTR through the system. Do not inform the customer that you are filing the CTR. Do not delay or refuse the transaction merely because a CTR is required — that would be improper.

Q: A customer is clearly in distress and says they urgently need to send $3,000 to bail their grandchild out of jail right now. What do I do?
A: This is a classic "grandparent scam." Do not process any transfer without additional screening. Say: "I can see you are worried, and I want to make sure everything is okay before we proceed. I need to ask you a couple of quick questions — this is entirely for your protection." Then ask: "Have you spoken directly to your grandchild by calling their regular phone number?" and "Have you been able to verify this with any other family member?" Gently explain: "I have to let you know that this is a very common scam where fraudsters call grandparents claiming a family member is in trouble. We see this frequently. I would strongly encourage you to hang up and call your grandchild or another family member directly before sending any money." Document the conversation fully. If the customer insists after being warned, escalate to supervisor before processing.

Q: An attorney calls claiming to hold power of attorney for one of our customers. Can I discuss the account with them?
A: Only if we have a valid, executed POA document on file that has been reviewed and accepted by our legal or operations team. If no POA is on file: "I'm not able to discuss any account details without a verified power of attorney that has been received and processed by our bank. I'd be happy to explain exactly what documentation we need and how to submit it." Do not accept verbal claims of POA, emailed copies without review, or assume based on the attorney's professional status.

Q: A customer says they received a call from someone claiming to be from Apex, who asked for their account number and card PIN. What do I tell them?
A: Use this exact language: "I'm very glad you're checking with us directly. Apex Bank will never — under any circumstances — call you and ask for your full account number, your full Social Security Number, your card number, or your PIN. We already have this information on file. If someone called you claiming to be from Apex and asked for any of this, that call was almost certainly a fraudster. Please do not call back any telephone number that person gave you. Only contact us using the number on the back of your card or on our official website at apexfinancial.com. Would you like me to review your account right now for any suspicious transactions?"

Q: A customer is very upset and says they are going to report Apex to the CFPB. How should I respond?
A: Never threaten, discourage, or create obstacles for a customer who wants to file a regulatory complaint. This is a customer's legal right and attempting to discourage it can itself be a UDAP (Unfair, Deceptive, or Abusive Acts or Practices) violation. Respond: "You absolutely have the right to file a complaint with the Consumer Financial Protection Bureau, and we take every CFPB complaint very seriously. The CFPB's website is consumerfinance.gov/complaint. I also want to do everything I can to resolve your concern right now — would you be willing to give me the opportunity to try?" Document the customer's statement verbatim in the CRM immediately.

Q: A customer claims our agent made them a promise that we cannot fulfill. What do I do?
A: Do not confirm or deny the prior promise without reviewing call notes and recordings. Say: "I want to make sure I understand the situation completely. Let me review the notes on your account from that interaction." If you find documentation of the promise: escalate to supervisor, as honoring it may require supervisor-level approval. If you cannot find documentation: "I want to be completely transparent — I don't have documentation of that commitment in our records. I'm going to escalate this to my supervisor who can review the call recording and help us find the right resolution." Do not tell the customer the prior agent was wrong without supervisor guidance.

=============================================================
SECTION 24: FORMAL COMPLAINT HANDLING AND ESCALATION PROCEDURES
=============================================================
A formal complaint is legally and operationally distinct from a routine service request or general expression of dissatisfaction. Misidentifying a formal complaint as a routine inquiry can create regulatory risk for Apex.

TRIGGERS THAT CONSTITUTE A FORMAL COMPLAINT:
The following situations require a formal complaint record in CRM, even if you were able to resolve the underlying issue:
- Customer explicitly uses the words "complaint," "formal complaint," or "formally complaining"
- Customer requests written documentation of their complaint or a written response from Apex
- Customer references filing with any regulator: CFPB, OCC, FDIC, Federal Reserve, state banking department, state attorney general, or any other regulatory body
- Customer threatens legal action, mentions retaining an attorney, or mentions filing a lawsuit
- Customer requests a supervisory callback or written response from management
- Customer references prior unresolved contact on the same issue (second occurrence escalation)
- Customer expresses that a previous resolution was unsatisfactory and they want further escalation

FORMAL COMPLAINT ENTRY PROCEDURE:
Step 1 — Acknowledge without prejudice: "I'm sorry you've had this experience. I want to make sure your concern is formally documented and gets the full attention it deserves."
Step 2 — Collect complete information: Full name and account number; exact nature of the complaint (what happened, when, and who was involved); what resolution the customer is seeking; preferred contact method for follow-up.
Step 3 — Create formal complaint record in CRM: Use the "Formal Complaint" category — NOT a general account note. Select appropriate subcategory (Fee Dispute | Service Failure | Error/Mistake | Agent Conduct | Product Complaint | Regulatory Concern | Legal Threat). Write description minimum 100 words in the description field — use specific facts, dates, and amounts.
Step 4 — Assign to complaints queue: Formal complaints route automatically to the Customer Experience Complaints team upon submission.
Step 5 — Provide case number and timeline: "Your formal complaint case number is [number]. A dedicated member of our customer experience team will contact you within 2 business days. You will receive a formal written response within 10 business days, as required by our policy."

CFPB COMPLAINT RESPONSE PROCESS:
When the CFPB forwards a consumer complaint to Apex through the CFPB consumer complaint portal, it is a regulatory matter with firm deadlines:
- 15 calendar days: Apex must provide an initial response to the CFPB portal
- 60 calendar days: Apex must provide a final substantive response
- Agents who receive calls from customers who have open CFPB complaints MUST transfer the call immediately to the Regulatory Complaints team (ext. 5-REG). Do not attempt to resolve independently — regulatory compliance requires documented handling.
- All account interactions while a CFPB complaint is open must be flagged in CRM so they are included in the complaint file

STATE REGULATORY COMPLAINTS:
State banking regulators (Texas Department of Banking, Illinois IDFPR, California DFPI, New York DFS, etc.) may also forward complaints. These are handled identically to CFPB complaints — same timeframes, same team routing, same documentation requirements. Never attempt to resolve a state regulatory complaint at the front-line agent level.

LEGAL THREAT PROTOCOL:
If a customer explicitly threatens legal action ("I'm going to sue you," "I have an attorney," "I've filed a lawsuit," "my attorney will be in touch"):
- Immediately and professionally redirect: "I understand completely. I want to make sure you're connected with the right team to address this appropriately."
- Transfer to Legal Escalation queue immediately — do not attempt to negotiate, settle, or discuss the merits of the potential legal claim
- Document verbatim in CRM exactly what the customer said — exact words matter in potential litigation
- Do not make any admissions of liability
- Do not offer settlements or financial concessions without explicit direction from the Legal department
- Do not discuss the situation with colleagues beyond what is necessary for the handoff

EXECUTIVE OFFICE ESCALATION:
When a customer requests to speak with the CEO, President, Chief Customer Officer, or any named executive:
- Do not provide any executive's direct telephone number, email address, or office location
- Do not attempt to transfer to an executive directly
- Say: "I completely understand, and I want to make sure your concern gets the highest level of attention. I'm going to submit this directly to our Executive Resolution team, which handles concerns at the executive level. A member of that team will contact you personally within 2 business days."
- Submit to Executive Escalation queue in CRM (monitored daily by the SVP of Customer Experience)
- Document: the customer's name, the executive they requested, and the nature of their concern
- Do not make any promises about what the executive will decide or offer

MEDIA AND JOURNALIST PROTOCOL:
If a customer or caller identifies themselves as a journalist, reporter, blogger, social media influencer, or representative of any media organization, or if they state they intend to contact the media about their experience:
- Do not confirm, deny, or discuss any customer account information or complaint specifics
- Do not make any statements about Apex's policies, practices, or positions
- Say: "For all media inquiries, our communications team is the appropriate point of contact. Their email is pressoffice@apexfinancial.com and they will be able to assist you."
- End the call professionally and immediately escalate to your supervisor and the Communications team
- Document in CRM: "[Date/Time] Caller identified as [journalist/media representative] from [organization if provided] regarding [general topic — no account specifics]. Referred to press office. Supervisor [name] notified."

END OF APEX FINANCIAL SERVICES CONTACT CENTER AGENT REFERENCE MANUAL — Q3 2026 EDITION
CONFIDENTIALITY NOTICE: This document contains proprietary operational procedures, compliance policies, and product information. Distribution outside of authorized Apex Financial Services personnel is strictly prohibited. All rates, limits, fees, and procedures are subject to change without notice. Agents are responsible for reviewing the Weekly Policy Update Bulletin every Monday morning before taking customer calls. Questions: Contact your Team Lead, the Compliance team at compliance@apexfinancial.com, or the BSA Officer at bsa@apexfinancial.com.'''

with open(ROUTES_FILE, 'r') as f:
    content = f.read()

# Find the exact closing of the contact_center system_prompt
# It ends with: Failure to complete monthly attestation by 5th business day of following month: System access suspended until completion""",
OLD_ENDING = 'Failure to complete monthly attestation by 5th business day of following month: System access suspended until completion""",\n'
NEW_ENDING = 'Failure to complete monthly attestation by 5th business day of following month: System access suspended until completion' + NEW_SECTIONS + '""",\n'

if OLD_ENDING not in content:
    print("ERROR: Could not find the target string. Check the file.")
    exit(1)

new_content = content.replace(OLD_ENDING, NEW_ENDING, 1)

with open(ROUTES_FILE, 'w') as f:
    f.write(new_content)

# Count tokens (approx)
import sys
start_idx = new_content.find('"contact_center"')
end_idx = new_content.find('"legal"')
cc_block = new_content[start_idx:end_idx]
sp_start = cc_block.find('"""You are an AI assistant for Apex')
sp_end = cc_block.rfind('""",')
if sp_start >= 0 and sp_end >= 0:
    sp = cc_block[sp_start+3:sp_end]
    print(f"Contact Center prompt: {len(sp):,} chars | ~{len(sp)//4:,} tokens")
else:
    print("Could not extract system prompt for measurement")

print("SUCCESS: Contact Center system prompt expanded.")
