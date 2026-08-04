"""
Add supplementary content to each scenario to reach ~8K tokens each.
Target: ~32,000 chars per scenario (8,000 tokens × 4 chars/token)
Current shortfall per scenario: need to add ~14K chars each
"""

CONTACT_CENTER_EXTRA = """
=============================================================
SECTION 13: DIGITAL BANKING AND MOBILE APP FEATURES
=============================================================
APEX MOBILE APP CAPABILITIES:
Account Management: View balances, transactions (90 days searchable), statements (7 years), tax documents
Transfers: Internal (instant); external ACH (1-3 business days; same-day available for $5); wire transfer (submit only, not release)
Bill Pay: Schedule one-time or recurring; add payees; manage payment calendar; eBill integration
Mobile Deposit: Photograph check (front and back); funds available next business day (partial same-day for accounts >12 months)
Card Controls: Lock/unlock debit and credit cards instantly; set spending limits by category; enable/disable international use; set merchant category restrictions
Alerts: Set custom alerts for: large transactions (threshold $), low balance, login attempts, card transactions; 2-step authentication push notifications
Budgeting Tools: Categorized spending insights; monthly budget goals; spending trends (3-month, 6-month, 12-month views)
Investment Account Linking: View Apex Brokerage and Apex Managed Portfolios alongside banking accounts

ZELLE WITHIN APEX MOBILE:
Send limits: Personal accounts $2,500/day, $10,000/30 days (Advantage: $5,000/$25,000; Premier: $10,000/$50,000)
Receive limits: No limit on receiving
Enrollment: Mobile number or email; verified via OTP
Dispute resolution: Zelle transactions are typically irreversible; educate customers on fraud risk before sending to unknown parties
Fraudulent Zelle transactions: File dispute DSP-102 (Zelle Unauthorized); provisional credit within 10 business days pending investigation

ATM NETWORK AND FEES:
In-network: 55,000 Allpoint + MoneyPass ATMs (fee-free for all accounts)
Out-of-network domestic: $3.00 Apex fee + operator surcharge (Advantage/Premier: full reimbursement; Essentials: no reimbursement)
International ATM: $5.00 Apex fee + operator surcharge + 2% foreign exchange (Premier: fully reimbursed)
ATM daily cash withdrawal limits: Essentials $1,000; Advantage $2,000; Premier $5,000 (higher limits by request with manager approval)

=============================================================
SECTION 14: SMALL BUSINESS BANKING (OVERVIEW FOR CONSUMER AGENTS)
=============================================================
Apex Business Checking:
- Business Essentials: $20/month (waived: $5,000 average balance OR 50+ transactions/month); 200 free transactions; $0.50 per transaction thereafter
- Business Advantage: $40/month (waived: $25,000 average balance); 500 free transactions; cash deposit fee $0.25 per $100 over $10,000/month
- Business Premier: $75/month (waived: $100,000 combined balance); unlimited transactions; dedicated business banker
Refer small business inquiries to Business Banking team (ext. 5-BIZ or businessbanking@apexfinancial.com)
Authorization: Consumer agents may open Business Essentials accounts; all others require Business Banking referral

Business Lines of Credit:
- $10,000-$500,000; based on business revenue and credit history
- Revolving with annual renewal; interest only on drawn amounts
- APR: Prime + 1.50% to Prime + 5.00% (currently 10.00%-14.00%)
- Requires: 2 years in business; $150,000 annual revenue; personal guarantee

Merchant Services:
- Payment processing: 2.6% + $0.10 per card-present; 2.9% + $0.30 card-not-present
- Hardware: Apex Tap (free with activation); Apex Register ($299); Apex Terminal ($149)
- Next-day funding to Apex Business Checking (standard); same-day available for $15/month upgrade
- Refer to Merchant Services team for merchant accounts

=============================================================
SECTION 15: INVESTMENT AND WEALTH MANAGEMENT PRODUCTS
=============================================================
APEX BROKERAGE (Self-Directed):
- Commissions: $0 for stocks, ETFs, options ($0.65/contract for options)
- Mutual funds: NTF (no-transaction-fee) for 3,000+ funds; $19.95 for non-NTF funds
- FDIC-insured cash sweep: 4.50% APY on uninvested cash
- Margin: Available for accounts >$2,000; margin rate: 8.50%-11.00% based on debit balance
- SIPC coverage: $500,000 ($250,000 cash); supplemental coverage up to $150M per client

APEX MANAGED PORTFOLIOS (Robo-Advisory):
- Minimum: $500
- Management fee: 0.25% annually (below industry average of 0.40%)
- Portfolios: 5 risk levels (Conservative, Moderately Conservative, Moderate, Moderately Aggressive, Aggressive)
- Automatic rebalancing: Quarterly and on significant market movements (>5% drift)
- Tax-loss harvesting: Available for taxable accounts >$25,000 (estimated 0.25%-0.75% additional annual return)

APEX FINANCIAL ADVISOR (Full-Service Wealth Management):
- Minimum: $100,000 in investable assets
- Fee: 1.00% AUM (up to $500K); 0.75% ($500K-$1M); 0.50% ($1M+)
- Services: Comprehensive financial plan; estate planning coordination; tax strategy; insurance review; college savings (529 plans); retirement income planning
- Referral: Set appointment with Financial Advisor team (ext. 5-WEALTH); advisor contacts client within 1 business day

RETIREMENT ACCOUNTS:
Traditional IRA: Contribution limit $7,000/year ($8,000 if age 50+); tax-deductible (income limits apply for W-2 earners with workplace plan); RMD required at age 73
Roth IRA: Same contribution limits; not tax-deductible; qualified distributions tax-free; no RMD; income limits: phase-out $146,000-$161,000 (single); $230,000-$240,000 (married filing jointly) — 2026 limits
SEP-IRA: For self-employed/small business; contribute up to 25% of compensation (max $69,000 2026); simplified setup; no employee contribution required
Rollover IRA: Accept rollovers from 401(k), 403(b), 457 plans; no limit; preserve tax-deferred status

529 College Savings Plans:
- Apex-sponsored Illinois 529 (direct-sold) or referral to national plans
- Contribution gift tax exclusion: $18,000/year/contributor ($90,000 front-loaded 5-year election)
- Qualified expenses: Tuition, fees, room/board, books, technology, K-12 tuition up to $10,000/year
- SECURE 2.0: Unused 529 funds can roll to Roth IRA (15-year waiting period; $35,000 lifetime limit; Roth annual limits apply)

=============================================================
SECTION 16: SPECIAL PROGRAMS AND ASSISTANCE
=============================================================
APEX HARDSHIP ASSISTANCE PROGRAM:
Eligibility: Customers experiencing documented financial hardship (job loss, medical emergency, natural disaster, domestic violence)
Options: Fee waivers (up to 3 months maintenance fees); overdraft fee refund (up to 6 months); loan deferral (up to 90 days, interest continues accruing); CD early withdrawal penalty waiver (one-time, per hardship event)
Documentation: Self-certification acceptable for events within 6 months; supporting documentation preferred
Authorization: Front-line agents may approve up to $150 in total fee waivers; supervisor approval for amounts above

ELDER FINANCIAL PROTECTION:
Red flags that require immediate escalation to Fraud/Compliance:
- Unusually large withdrawals for customer's typical pattern
- Customer accompanied by third party who answers for them or pressures them
- Customer mentions giving money to "sweetheart" online relationship or "prize" claims
- Signs of confusion, fear, or cognitive impairment during interaction
- Third party calling on behalf of customer without documented POA
Action: Create Elder Financial Exploitation alert in system; contact Fraud team ext. 5-FRAUD; do not complete suspicious transaction; speak to customer privately if possible

MILITARY BANKING PROGRAM:
Servicemembers Civil Relief Act (SCRA):
- Interest rate cap: 6% on pre-service loans (credit cards, mortgages, personal loans) during active duty
- Protection against foreclosure: 12 months after active duty service
- Required documentation: Orders signed by commanding officer + customer signature
- Apply retroactively to date of deployment
- Apex additional benefit: Zero fees on all accounts during deployment; free wire transfers; ATM fee reimbursements globally

ACCESSIBILITY SERVICES:
- TTY/TDD: Available 24/7 at 800-555-TTY (800-555-8898)
- Spanish-speaking agents: Available 24/7 (Spanish IVR prompt available)
- Other languages: Translation service available in 200+ languages (allow 2-5 minutes to connect interpreter)
- Large print statements: Available at no charge (request in CRM note)
- Braille statements: Available with 10-day processing time

=============================================================
SECTION 17: DIGITAL SECURITY AND FRAUD PREVENTION
=============================================================
ACCOUNT TAKEOVER (ATO) PREVENTION:
Risk signals that trigger enhanced verification:
- Login from new device or unrecognized IP
- Login from different geographic location than previous within 24 hours
- Multiple failed login attempts followed by success
- Large transaction immediately after login
- Address, email, or phone number change request same session as large transfer

Step-up authentication required for:
- Transactions >$2,500 (OTP required)
- Address changes (OTP + security question)
- Beneficiary/payee changes (24-hour hold + OTP)
- Password reset from new device (video verification or branch visit may be required)

SOCIAL ENGINEERING DEFENSE — CUSTOMER EDUCATION:
Apex will NEVER:
- Call and ask for your full SSN, card number, or PIN
- Send a text with a link and ask you to log in and verify
- Ask you to purchase gift cards to resolve an account issue
- Ask you to send money via Zelle to "secure" your account

Customer warning script: "I want to make sure you're protected — Apex will never ask you to send money or provide gift card numbers over the phone. If anyone other than you calls claiming to be Apex and asks for payment, please hang up and call us directly at 1-800-APEX-BANK."

SYNTHETIC IDENTITY FRAUD:
Red flags during account opening: Inconsistencies between SSN issuance date and date of birth; SSN never previously used for credit (thin file + high income claim); address is vacant lot or mail forwarding service; employer cannot be verified; income inconsistent with credit history
Action: Place account in pending review; refer to New Account Review team; do not communicate reason to applicant

CARD COMPROMISE RESPONSE:
Card compromise notification procedures:
- Mass compromise (Visa/MC notification): Apex issues replacement cards within 5-7 business days; customer notified via text/email
- Individual compromise: Block card immediately; expedited replacement ($0 for first occurrence; $15 for expedited overnight delivery)
- Provisional credit: Issued within 5 business days for documented unauthorized transactions

=============================================================
SECTION 18: QUALITY AND COMPLIANCE MONITORING
=============================================================
Call Monitoring and Scoring:
All calls scored on: Compliance (40 points) | Customer Experience (35 points) | Product Knowledge (15 points) | Call Efficiency (10 points)
Minimum monthly score required: 80/100
Score below 70: Immediate coaching session with supervisor
Score below 60 on compliance section: Compliance review and retraining required

Required Elements on Every Call (scored):
- Proper greeting with agent name and department
- Identity verification completed before account access
- Recording disclosure (automated IVR handles this; agent must not override)
- Address customer by name minimum 3 times
- Summarize resolution before ending call
- Proper closing with case number provided to customer

Compliance Attestation:
Agents must complete monthly attestation confirming:
- Annual BSA/AML training completed
- Annual UDAP/consumer protection training completed
- Regulatory changes acknowledgment (distributed via compliance portal)
Failure to complete monthly attestation by 5th business day of following month: System access suspended until completion"""

LEGAL_EXTRA = """
=============================================================
EXHIBIT C — APPROVED SUBPROCESSORS AND SECURITY REQUIREMENTS
=============================================================
APPROVED SUBPROCESSORS (as of January 15, 2026):
1. Amazon Web Services, Inc. (AWS) — Cloud infrastructure (US-East-1, US-West-2)
   - Services: Compute (EC2), Storage (S3), Database (RDS, DynamoDB), Networking (VPC, CloudFront)
   - Certification: ISO 27001, SOC 1/2/3, PCI DSS, FedRAMP Moderate
   - DPA: AWS Customer Agreement DPA incorporated by reference

2. Snowflake Inc. — Data warehousing and analytics
   - Data processed: Anonymized usage data, aggregated reporting datasets
   - Region: AWS US-East-1 (Snowflake Business Critical tier)
   - Certification: SOC 2 Type II, ISO 27001

3. Datadog, Inc. — Infrastructure monitoring and logging
   - Data processed: Application logs, performance metrics (no Client personal data)
   - Retention: 30 days rolling logs
   - Certification: SOC 2 Type II

4. Okta, Inc. — Identity and access management (employee SSO)
   - Data processed: Employee credentials (not Client end-user data)
   - Certification: SOC 2 Type II, ISO 27001, FedRAMP Authorized

5. Stripe, Inc. — Payment processing for subscription billing
   - Data processed: Client billing information only (credit card tokens)
   - Certification: PCI DSS Level 1

Client consent required for any changes to this subprocessor list. Vendor will provide 30 days' advance notice of subprocessor additions or changes. Client has right to object within 30 days; if objection cannot be resolved, Client may terminate affected services without penalty.

SECURITY REQUIREMENTS (Vendor Obligations):

Network Security:
- All systems deployed in VPC with private subnets; no direct internet exposure to application servers
- Web Application Firewall (WAF) protecting all public endpoints (AWS WAF; rule updates within 24 hours of new vulnerability)
- DDoS protection: AWS Shield Advanced (provides SLA for DDoS mitigation response)
- Network segmentation: Production, staging, and development environments fully isolated (separate VPCs, separate AWS accounts)
- Intrusion Detection System (IDS): Real-time monitoring; anomaly alerts within 15 minutes

Endpoint Security:
- All developer endpoints: MDM-managed; full disk encryption (BitLocker/FileVault); EDR agent required
- No production data on developer laptops; access via jump server only
- USB/removable media: Blocked on all production-connected systems
- Screen lock: 5-minute inactivity timeout on all systems

Identity and Access Management:
- MFA required: All employee access (TOTP or hardware security key)
- Privileged Access Management (PAM): CyberArk for all privileged (root/admin) access; session recorded
- Principle of least privilege: Role-based access; quarterly reviews; automated deprovisioning on HR termination
- Password policy: Minimum 12 characters; complexity requirements; 90-day rotation; no reuse of 12 prior passwords
- Service accounts: Non-interactive; rotated quarterly; no human-readable credentials in code (AWS Secrets Manager)

Vulnerability Management:
- Vulnerability scanning: Weekly authenticated scans (Tenable.io); critical vulnerabilities remediated within 7 days; high within 30 days
- Penetration testing: Annual external test by qualified third party; results shared with Client within 30 days
- Bug bounty: Vendor operates private bug bounty program; security researchers may report via security@vendor.com
- Patch management: OS patches applied within 72 hours (critical), 30 days (high), 90 days (medium) of release

Logging and Monitoring:
- Audit logs: All privileged access, configuration changes, data access, authentication events
- Log retention: Minimum 12 months online; 7 years archive (immutable S3 storage)
- SIEM: All logs centralized; real-time alerting on security events; 24/7 SOC monitoring
- Incident response: SOC staffed 24/7; P1 incidents escalated to CISO within 1 hour

=============================================================
EXHIBIT D — THIRD-PARTY INTEGRATIONS
=============================================================
The following third-party integrations are pre-built and available:
- Salesforce CRM: Bidirectional sync; Customer object, Opportunity, Case
- Microsoft 365: SharePoint document library sync; Teams notifications; Outlook calendar integration
- Slack: Webhook notifications; bot integration for alerts
- Jira: Issue creation from platform; bi-directional status sync
- ServiceNow: ITSM integration; incident creation; change management
- Tableau: Data connector; refresh scheduling; embedded analytics
- Workday: User provisioning/deprovisioning; HRIS sync
- Okta: SSO/SAML 2.0; SCIM provisioning; group-based license management
- Active Directory: LDAP sync; on-premises and Azure AD hybrid support

Custom Integrations:
- REST API: Full OpenAPI 3.0 specification; OAuth 2.0 / API key authentication
- Webhooks: Real-time event notifications; HMAC-SHA256 signature verification
- SDK: Python, JavaScript, Java, .NET client libraries (open source on GitHub)
- iPaaS Connectors: Zapier, Make (Integromat), Boomi, MuleSoft

API Rate Limits (default; negotiable for Enterprise):
- Standard: 1,000 requests/minute per API key
- Premium: 10,000 requests/minute
- Bulk operations: 100 concurrent requests; queue for additional
- Webhook delivery: 3 retry attempts (1 min, 5 min, 30 min); dead-letter queue for failures

=============================================================
EXHIBIT E — KEY CONTACTS AND GOVERNANCE
=============================================================
VENDOR CONTACTS:
- Executive Sponsor: Sarah Chen, VP Customer Success, schen@datasolutions.com
- Customer Success Manager (CSM): Michael Torres, mitorres@datasolutions.com, +1 (415) 555-0192
- Technical Account Manager (TAM): Jennifer Park, jpark@datasolutions.com, +1 (415) 555-0193
- Support Portal: support.datasolutions.com (ticket creation; 24/7 for P1)
- Security Contact: security@datasolutions.com
- Legal/Contract Notice: legal@datasolutions.com; DataSolutions LLC, 350 Mission Street, Suite 900, San Francisco, CA 94105
- Billing: billing@datasolutions.com

CLIENT CONTACTS (to be completed at contract execution):
- Executive Sponsor: [Client field]
- Primary Business Contact: [Client field]
- Technical Contact: [Client field]
- Security Contact: [Client field]
- Billing Contact: [Client field]
- Legal/Contract Notice: [Client field]

GOVERNANCE MEETINGS:
- Weekly Sync: CSM + Client Primary Contact (30 min; operational updates)
- Monthly Business Review (MBR): CSM + TAM + Client Sponsor (60 min; metrics, roadmap, escalations)
- Quarterly Business Review (QBR): VP CS + Client Executive Sponsor (90 min; strategic review, upcoming roadmap, contract review)
- Annual Executive Review: CRO + Client CTO/CIO (60 min; partnership review, multi-year planning)

=============================================================
AMENDMENT NO. 1 (Executed March 15, 2026)
=============================================================
Parties agreed to the following modifications to the original Agreement:
1. Section 5.7 CPI Adjustment: Cap on annual CPI adjustment increased to maximum 5% (from uncapped) for contract years 2 and 3.
2. Section 10.1 Uptime SLA: Scheduled maintenance window reduced from 4 hours weekly to 2 hours weekly; Client now receives 48-hour notice (increased from 72-hour notice).
3. Schedule 1 — New Statement of Work SOW-002 added: AI/ML Feature Development; scope: 3 custom ML models for Client's predictive analytics use case; fixed fee $450,000; delivery milestones Q2-Q4 2026.
4. Exhibit C — Subprocessor Addition: Databricks, Inc. added as approved subprocessor for SOW-002 ML workloads (AWS us-east-1; SOC 2 Type II certified).
All other terms remain unchanged. Amendment effective March 15, 2026.

=============================================================
AMENDMENT NO. 2 (Executed June 1, 2026)
=============================================================
1. Section 2.2 Authorized Users: User limit increased from 2,500 to 4,000 Authorized Users. Additional user fee reduced from $45/user/month to $38/user/month for users 2,501-4,000.
2. New Section 2.7 AI Features: Vendor's generative AI features require Client's written consent before processing Client Data through third-party AI model providers. Client has provided consent for OpenAI GPT-4o API (with zero data retention agreement from OpenAI) for specified use cases only.
3. New Section 8.10 AI Data Processing: All AI-processed data logged; Client may request deletion of AI interaction logs within 30 days.
Amendment effective June 1, 2026.

=============================================================
STATEMENT OF WORK NO. 001 — IMPLEMENTATION (January 15, 2026)
=============================================================
Scope: Platform implementation including: data migration (from legacy vendor systems); system configuration; integration with Salesforce CRM and Microsoft 365; user training (150 Authorized Users); go-live support
Timeline: 16 weeks (completion target: May 9, 2026)
Milestones and Payment Schedule:
- Milestone 1 (Week 2): Environment provisioned; infrastructure review complete — $125,000
- Milestone 2 (Week 6): Data migration complete; Salesforce integration live — $300,000
- Milestone 3 (Week 10): Microsoft 365 integration; UAT complete — $300,000
- Milestone 4 (Week 14): Training complete (90% of target users) — $250,000
- Milestone 5 (Week 16): Go-live; hypercare complete — $275,000
Total SOW-001 Value: $1,250,000
Key Personnel: Implementation Lead: David Kim (cannot be changed without Client consent); Subject Matter Expert: Lisa Rodriguez
Acceptance Criteria: Milestone sign-off within 10 business days of milestone delivery notification"""

HEALTHCARE_EXTRA = """
=============================================================
SECTION 9: ONCOLOGY CLINICAL SUPPORT
=============================================================
Memorial Health NCI-Designated Cancer Center Protocols:

BREAST CANCER MANAGEMENT:
Staging (AJCC 8th Edition): Stage I-II (early stage); Stage III (locally advanced); Stage IV (metastatic)

Early-Stage Breast Cancer (Stage I-II) — Preferred Regimens:
HR+/HER2-: Endocrine therapy backbone (Tamoxifen or Aromatase Inhibitor × 5-10 years); consider adding CDK4/6 inhibitor if high-risk (abemaciclib per MonarchE criteria); chemotherapy for high-risk features (Oncotype DX score ≥26)
HER2+ (any HR): Trastuzumab (Herceptin) + pertuzumab (Perjeta) + chemotherapy (AC-THP regimen); Neratinib extended adjuvant for high-risk
Triple Negative (TNBC): Immunotherapy (pembrolizumab/Keytruda) + chemotherapy if PD-L1 CPS ≥10 or high-risk; Olaparib for BRCA1/2-mutant; Capecitabine for residual disease post-neoadjuvant

Metastatic Breast Cancer:
HR+/HER2-: Fulvestrant + CDK4/6 inhibitor (palbociclib, ribociclib, or abemaciclib); second-line: Alpelisib (if PIK3CA-mutant; check glucose tolerance); Everolimus + Exemestane
HER2+: Trastuzumab deruxtecan (T-DXd/Enhertu) — preferred second-line; superior PFS vs lapatinib+capecitabine; interstitial lung disease risk (monitor pulmonary symptoms)
TNBC: Sacituzumab govitecan (Trodelvy) + pembrolizumab; BRCA mutation: Olaparib or talazoparib

Bone Metastasis:
- Denosumab (Xgeva) 120 mg SQ monthly: Preferred over bisphosphonates (no renal dose adjustment needed); RANKL inhibitor
- Zoledronic acid (Reclast) 4 mg IV q3-4 weeks: Renal monitoring required; hold if CrCl <35
- Osteonecrosis of Jaw (ONJ) risk: Dental evaluation before starting; no invasive dental procedures during treatment if avoidable

LUNG CANCER:
NSCLC — Biomarker Testing (required before first-line systemic therapy):
EGFR (exon 19 del / L858R): Osimertinib (Tagrisso) 80 mg daily — first-line preferred; crosses BBB; T790M resistance mechanism
ALK rearrangement: Alectinib (Alecensa) or brigatinib (Alunbrig) — superior CNS penetration; avoid crizotinib first-line
ROS1: Entrectinib (Rozlytrek) or crizotinib
BRAF V600E: Dabrafenib + trametinib
KRAS G12C: Sotorasib (Lumakras) or adagrasib (Krazati) — second-line
MET exon 14: Capmatinib (Tabrecta) or tepotinib
PD-L1 TPS ≥50% (no driver mutation): Pembrolizumab (Keytruda) monotherapy — first-line
PD-L1 any/unknown (no driver): Carboplatin + pemetrexed + pembrolizumab (non-squamous) or carboplatin + paclitaxel + pembrolizumab +/- bevacizumab (squamous)

Small Cell Lung Cancer (SCLC):
Limited stage: Concurrent chemoradiation (etoposide + cisplatin × 4 cycles + thoracic RT); prophylactic cranial irradiation (PCI)
Extensive stage: Atezolizumab (Tecentriq) + carboplatin + etoposide (first-line); durvalumab + chemotherapy alternate option
Recurrent: Topotecan; lurbinectedin (second-line)

Chemotherapy-Induced Nausea/Vomiting (CINV) Prevention:
High emetogenic risk (cisplatin, cyclophosphamide ≥1500 mg/m²):
- Day 1 (prior to chemo): Ondansetron 32 mg IV + Dexamethasone 12 mg IV + NK1 antagonist (aprepitant 125 mg PO OR fosaprepitant 150 mg IV) + Olanzapine 10 mg PO (if poor control previously)
- Days 2-4: Dexamethasone 8 mg daily + Aprepitant 80 mg PO (Days 2-3) + Olanzapine 10 mg daily

Moderate emetogenic risk (carboplatin, oxaliplatin, irinotecan):
- Ondansetron 8 mg IV or 24 mg PO + Dexamethasone 12 mg + consider NK1 for carboplatin AUC ≥4
- Anticipatory nausea: Lorazepam 0.5-1 mg PO night before and morning of chemo

=============================================================
SECTION 10: CRITICAL CARE AND VENTILATOR MANAGEMENT
=============================================================
ARDS (Acute Respiratory Distress Syndrome):
Berlin Definition: PaO2/FiO2 ratio <300 (mild: 200-300; moderate: 100-200; severe: <100); bilateral infiltrates; not explained by cardiac failure; within 1 week of insult

Lung Protective Ventilation Strategy (ARDSNET):
- Tidal volume: 6 mL/kg predicted body weight (PBW); DO NOT exceed 8 mL/kg
- Plateau pressure: Keep ≤30 cmH2O; reduce tidal volume if exceeded
- PEEP: Set per FiO2/PEEP table (lower or higher PEEP tables — clinical judgment)
- FiO2 titration: Target SpO2 88-95% or PaO2 55-80 mmHg
- Permissive hypercapnia: Accept PCO2 45-80 mmHg if pH >7.20

Prone Positioning:
- Indication: PaO2/FiO2 <150 on FiO2 ≥0.60, PEEP ≥5
- Duration: ≥16 hours per session; repeat daily until P/F ratio improves >150 on supine
- Contraindications: Unstable spine; open abdomen; facial/orbital injury; extreme obesity (relative)
- Pressure injury prevention: Gel pads at pressure points; reposition face every 2 hours

Neuromuscular Blockade (NMB):
- Indication: Severe ARDS (P/F <150) with ventilator dyssynchrony unresponsive to sedation
- Agent: Cisatracurium 0.2 mg/kg bolus then 0.03-0.06 mg/kg/hr infusion (preferred — no active metabolite accumulation in renal failure)
- Duration: 48 hours maximum (ACURASYS trial); assess daily
- Train-of-four (TOF) monitoring: Target 1-2 twitches out of 4; reassess every 6 hours
- CAUTION: All patients on NMB require adequate sedation; sedation monitoring especially critical

Ventilator Weaning Protocol:
Spontaneous Breathing Trial (SBT) eligibility criteria:
- FiO2 ≤0.40 AND PEEP ≤8 cmH2O
- Hemodynamically stable (no vasopressors or weaning vasopressors)
- Awake and following commands (RASS -1 to 0)
- Absence of active respiratory failure (RR <30; SpO2 ≥88%)

SBT Method: 30-minute trial on T-piece or low CPAP (5 cmH2O) / PSV (7 cmH2O)
Pass criteria: RR <30; SpO2 ≥88%; no significant respiratory distress; HR stable; BP stable
Failure criteria: Any deterioration in the above — return to prior settings; reassess daily

SEPTIC SHOCK MANAGEMENT (Post-Initial Resuscitation):
Vasopressors — First-line: Norepinephrine 0.05-2.0 mcg/kg/min (titrate to MAP ≥65)
Second-line (refractory): Vasopressin 0.03-0.04 units/min (fixed dose, do not titrate) as adjunct
Corticosteroids: Hydrocortisone 200 mg/day continuous infusion (or 50 mg IV q6h) if: vasopressor-dependent at 24h despite adequate resuscitation; do not use ACTH stimulation test to guide
Mineralocorticoid: Fludrocortisone 50 mcg daily (if hydrocortisone without inherent mineralocorticoid effect)
Weaning: Vasopressor wean first, then steroids (over 2-3 days; avoid abrupt discontinuation)

=============================================================
SECTION 11: PHARMACY SERVICES AND MEDICATION MANAGEMENT
=============================================================
HIGH-ALERT MEDICATION SAFETY PROGRAM:
Double-check required (two licensed clinicians) before administration:
- Concentrated electrolytes: KCl >40 mEq/100 mL; hypertonic saline (3%); sodium bicarbonate
- Insulin infusions: All concentrations
- Neuromuscular blocking agents: Paralytic infusions and boluses
- Anticoagulants: Heparin infusions; thrombolytics (tPA, reteplase, tenecteplase)
- Chemotherapy: All chemotherapy agents and targeted therapies
- Opioid infusions: All continuous opioid infusions; PCA loading doses
- Pediatric medications: All medications for patients <18 (calculated per weight)

Drug Shortage Management (Current — Q3 2026):
CRITICAL SHORTAGES:
- IV Amoxicillin-clavulanate: Use oral formulation if clinical situation permits; if IV required use ampicillin-sulbactam 3g q6h
- Metformin 1000mg ER: Use IR formulation; split dosing to minimize GI effects (500mg BID or 850mg BID)
- Normal Saline 0.9% large volume (1L bags): Conserve; use LR (Lactated Ringer's) as primary resuscitation fluid; request allocation from pharmacy leadership for critical needs
- Furosemide injection 10mg/mL: Use 40mg/mL concentration with appropriate dilution; pharmacy to prepare unit dose

MODERATE SHORTAGES:
- Ondansetron IV 4mg/2mL vials: Use compounded preparation from pharmacy or oral disintegrating tablet (bioequivalent)
- Potassium chloride oral liquid: Use tablets crushed in water; potassium bicarbonate effervescent tablets as alternative

Drug Interaction Management:
Pharmacy performs automated drug interaction screening on all orders. Categories:
- Contraindicated (Grade A): Order blocked; prescriber must document override with clinical rationale; pharmacist notification required
- Major (Grade B): Alert generated; pharmacist review before dispensing; clinical decision support note in chart
- Moderate (Grade C): Informational alert; clinician discretion
- Minor (Grade D): Informational only; no workflow interruption

Renal Dosing Automatic Adjustment:
Pharmacy system automatically flags orders requiring dose adjustment for CrCl <60. Pharmacist verifies and adjusts before dispensing. Prescribers notified of all adjustments. Critical renally-cleared drugs requiring close monitoring: vancomycin, aminoglycosides, metformin, LMWH, direct thrombin inhibitors.

=============================================================
SECTION 12: PATIENT EXPERIENCE AND COMMUNICATION
=============================================================
Teach-Back Method (Required for all patient education):
Step 1: Provide information in plain language (6th-grade reading level)
Step 2: Ask patient to explain back in their own words ("I want to make sure I explained that clearly. Can you tell me what you'll do when you get home?")
Step 3: Clarify any misunderstandings; re-teach as needed
Step 4: Document: "Teach-back performed; patient verbalized understanding of [topic]"

Mandatory Patient Education Topics (document in chart):
- Diagnosis and planned treatment
- Medications (name, purpose, common side effects, when to seek help)
- Activity restrictions and wound care (if applicable)
- Follow-up appointments (who, when, what to bring)
- Warning signs requiring return to ED or urgent call to provider
- Smoking cessation counseling (if current smoker)

Health Literacy Resources:
- All written materials available at 6th-grade reading level or below
- Translated materials: Available in 18 languages (Spanish, Polish, Chinese-Mandarin, Arabic, Hindi, Tagalog, and 12 others)
- Interpreter services: In-person interpreter within 30 minutes for non-emergent; phone/video within 5 minutes (24/7)
- Never use family members as interpreters (HIPAA and quality concern; exception: patient request documented)

Discharge Planning Requirements (all inpatients >24 hours):
- Discharge planning screen within 24 hours of admission (social work referral if high-risk)
- Medication reconciliation: Compare admission medications to discharge prescriptions; resolve all discrepancies
- Follow-up appointment: Scheduled before discharge for all high-risk patients (CHF, COPD, pneumonia, sepsis)
- Transition of care call: Nursing to contact patient 24-48 hours post-discharge (document outcome)
- 30-day readmission risk tool: Calculate LACE+ score; activate high-risk follow-up pathway if score ≥10"""

TELCO_EXTRA = """
=============================================================
SECTION 12: TROUBLESHOOTING GUIDE — WIRELESS
=============================================================
CALL QUALITY ISSUES:
Dropped Calls / No Service:
Step 1: Verify customer's current location vs coverage map (use AVAIL_CHECK with address/GPS)
Step 2: Check for network outages in area (NOC_STATUS system; public outage map vzw.com/outage)
Step 3: Basic troubleshooting:
  a. Toggle Airplane Mode off/on (30 seconds)
  b. Restart device
  c. Remove and reinsert SIM (physical SIM) or reset eSIM profile
  d. Check for carrier settings update (Settings > General > About > carrier update prompt)
  e. Check for device software update
Step 4: If issue persists in specific location: Network Engineering ticket NET_TICKET (resolution: 3-5 business days for site investigation)
Step 5: If widespread: Check NOC for planned maintenance or incident; provide ETA to customer

Slow Data Speeds:
Diagnostic questions: Where are you located? Indoors or outdoors? What device? What activity (streaming, browsing)?
Common causes:
- Network congestion (prime time 6-9 PM): "During high-demand periods, unlimited customers may experience temporarily reduced speeds"
- 50GB monthly data used: Deprioritized during congestion (not throttled; will be faster on less congested network)
- Device issue: Clear app cache; restart device; toggle 5G/LTE preference
- SIM/eSIM issue: Reprovision SIM in system if older than 2 years
Speed test: Ask customer to run Verizon Speed Test app and share results; document in ticket

TEXT MESSAGE ISSUES:
SMS delivery failure: Common causes: recipient DND; blocked sender; carrier filtering (spam detection); international carrier agreement
MMS failure: Check mobile data enabled; check APN settings (Settings > Cellular > APN)
Group text issues: Check iMessage/SMS settings; all parties must have data for group MMS on Android

VOICEMAIL ISSUES:
Visual voicemail not loading: Delete VM app cache; re-download; toggle VVM in settings
Voicemail full: Customer cannot receive new messages; guide to delete old messages (*86 from handset)
Default PIN: Last 4 digits of phone number; reset via MyVerizon or IVR

DEVICE CONNECTIVITY:
Bluetooth not pairing: Ensure device is in pairing mode; clear paired device list; restart both devices
Wi-Fi calling: Enable in Settings > Phone > Wi-Fi Calling; improves indoor coverage; calls/texts over Wi-Fi; no extra charge
Wi-Fi assist: Automatically switches to cellular when Wi-Fi weak; may cause unexpected data usage; advise customers with limited data plans

=============================================================
SECTION 13: TROUBLESHOOTING GUIDE — HOME INTERNET
=============================================================
5G HOME INTERNET:
No internet connection:
Step 1: Check indicator lights on Verizon Home Router (5G Ultrawideband Gateway ASK-NCQ1338)
  - Solid white: Normal operation
  - Flashing white: Connecting to network
  - Solid yellow: Limited or no connection
  - Flashing red: Hardware issue; reboot required
Step 2: Power cycle router (unplug 30 seconds; plug back in; wait 3 minutes)
Step 3: Check device connection (wired vs wireless; try both)
Step 4: Verify 5G signal: Home app shows signal strength; rotate router for best signal (avoid metal objects, concrete walls, fish tanks)
Step 5: Reboot modem remotely via My Verizon app (if customer cannot access router)
Step 6: Remote network reset (from agent toolkit); full network re-provision (last resort)

Slow speeds:
- Run speed test at vzw.com/speedtest (agent can remote trigger speed test)
- Expected speeds: 5G Ultra Wideband typical 300-1000 Mbps; LTE Home Internet typical 25-50 Mbps
- Speeds below 50 Mbps (UW) or 15 Mbps (LTE): Investigate; may escalate to Home Internet Engineering
- Router placement: Elevate router; avoid enclosed spaces; central location preferred; extender available ($50; reduces speeds by ~30%)

FIOS:
No connection — 3 light status check on ONT (Optical Network Terminal):
- LOS (Loss of Signal): Red light → fiber cut or ONT issue; dispatch required (same/next day)
- Data: Green = normal; Off = no data signal; escalate to Fios Engineering
- Power: Green = OK; Red = battery backup issue (non-urgent)

Router issues: Force restart via app; if ONT normal but router down → router replacement (tech dispatch or mail)
Speed issues: Gigabit speed only at router ethernet port; wireless speeds will be lower (Wi-Fi 6: ~800 Mbps; Wi-Fi 5: ~400 Mbps)

=============================================================
SECTION 14: ORDER MANAGEMENT AND FULFILLMENT
=============================================================
DEVICE ORDER TRACKING:
Order placed in store or online → tracking sent via email within 2 hours
Delivery windows: Standard (3-5 business days): Free; Expedited (2 business days): $19.99; Overnight: $29.99
In-store pickup: Same-day if ordered before 3 PM local time; available within 2 hours of notification
Order status: ORDER_STATUS tool in ACSS; customer can track at vzw.com/ordertracking

TRADE-IN PROCESS (end-to-end):
Step 1: Agent provides trade-in estimate in system (valid 30 days; lock in estimate today)
Step 2: Customer receives prepaid shipping kit (2-3 business days; postage paid)
Step 3: Customer ships device (must ship within 14 days of receiving kit)
Step 4: Verizon receives device; condition verified within 5 business days
Step 5: Bill credit begins on next billing cycle (applied over 36 months)
Common issues:
- Condition dispute: Customer has 30 days to dispute trade-in value; submit photos; regional escalation if needed
- Device not received: Tracking number required; if USPS/UPS shows delivered but not logged, open trace case
- Value expired: Re-estimate required; current promo value applies (may be higher or lower)

PORT-IN PROCESS (switching from competitor):
Customer keeps existing number (most common):
- Complete Verizon activation; select "Transfer existing number"
- Previous carrier account must remain active until port completes (typically 1-4 hours; business accounts: up to 2 days)
- Customer will receive text when port is complete; old service cancels automatically
- Porting fails: Common causes: incorrect account info; porting PIN wrong (different from PIN); account lock at old carrier

Same-day service setup for switchers:
- eSIM: Instant activation; no shipping required; available on iPhone 14+ and most Android 2022+
- Physical SIM: Available in-store; ship if remote customer
- Both: Backup physical SIM recommended for international travel

=============================================================
SECTION 15: ESCALATION AND SUPERVISOR PROCEDURES
=============================================================
WHEN TO ESCALATE (Summary Matrix):

Immediate transfer to Supervisor:
- Customer requests supervisor (do NOT delay — transfer within 3 minutes)
- Customer threatens legal action or references attorney; do NOT offer legal opinion; escalate and document
- FCC complaint mentioned: Create FCC_COMPLAINT ticket before transfer
- BBB complaint: Note in account; transfer
- Social media threat: Create SOCIAL_ESCALATION note; transfer to Social Media Response team if customer identifies themselves publicly
- Account past-due >$200 with dispute (risk of false disconnect complaint)
- Fraud suspected on account

Technical Escalation to Tier 2:
- Network issue that persists after all agent troubleshooting steps
- Device issue with defect not covered by standard return/exchange (DOA claim outside 30 days)
- Complex billing dispute >3 months history
- Corporate/business account with >10 lines requiring specialized support

Escalation to Back Office:
- Billing dispute requiring credit >$150 (agent authority: up to $150 per account per month)
- Order fulfillment dispute requiring warehouse contact
- Trade-in value dispute after agent assessment
- Coverage guarantee dispute requiring network team review

CREDIT AUTHORIZATION MATRIX:
Agent authority: Up to $50 per call; up to $150 per account per rolling 30 days
Supervisor authority: Up to $300 per account per rolling 30 days; up to $500 in documented exceptional cases
Manager/Back Office: >$500; pattern of credits; goodwill credit for extended outage impact

DOCUMENTATION REQUIREMENTS FOR CREDITS:
- Reason code (mandatory; choose from approved list of 24 codes)
- Amount and duration
- Customer verbalization of satisfaction (Y/N)
- Supervisor approval code (if over agent threshold)
- Future prevention note (what was changed to prevent recurrence)

=============================================================
SECTION 16: COMPETITIVE INTELLIGENCE (Q3 2026)
=============================================================
AT&T KEY DIFFERENTIATORS (to address when mentioned by customer):
AT&T Strengths: FirstNet (first responder network priority); AT&T TV bundle; strong corporate enterprise relationships
Verizon Counter: Best overall network reliability (RootMetrics national champion 6 consecutive years); C-Band 5G coverage fastest rollout; myPlan flexibility (no bundle lock-in)
AT&T Pricing (approximate): Unlimited Starter ~$35/line (4 lines, AutoPay); Unlimited Extra ~$45/line; Unlimited Premium ~$55/line
Verizon Response: myPlan offers comparable pricing + perks flexibility; emphasize network quality: "you get what you pay for — Verizon's reliability record is unmatched"

T-MOBILE:
T-Mobile Strengths: Aggressive pricing (Go5G at $35/line 4 lines); strongest mid-band 5G coverage nationwide; T-Satellite with SpaceX Starlink for remote areas (late 2026)
Verizon Counter: Verizon mmWave Ultra Wideband superior in urban dense areas (sports stadiums, airports, downtown); C-Band now matches T-Mobile mid-band in suburban; price-match authorized in retention (see Section 10)
T-Mobile Price Match Authorization: Agents authorized to match T-Mobile comparable plan pricing for 12 months for accounts >2 years (supervisor approval required; document T-Mobile rate card)

DISH/Boost Mobile:
Budget competitor; network built on AT&T MVNO; less robust than Verizon
Counter: Emphasize Verizon's network investment, coverage, and reliability; Boost customers often return after poor experience

Cable MVNOs (Comcast Xfinity Mobile, Charter Spectrum Mobile, Cox Mobile):
Model: Operate on Verizon's network (MVNO); offer discounted pricing with cable bundle
Counter: "You're actually using Verizon's network through them — but with us you get direct support, full network priority, and access to all features including 5G Ultra Wideband." MVNO customers deprioritized behind Verizon postpaid customers during congestion.
Xfinity Mobile approximate pricing: $15/line (1 GB "By the Gig"); $40/line (Unlimited); requires Xfinity internet ($60+/month) to qualify for pricing
Verizon Counter: Home Internet bundle discount brings Verizon wireless pricing competitive; no cable subscription required"""

# Now update the file
import re

f = '/home/nwasim/projects/ddn-kv-cache/backend/app/api/routes.py'
content = open(f).read()

# Find each scenario's system_prompt and append extra content
def append_to_prompt(content, scenario_key, extra):
    # Find the system_prompt for this scenario and extend it before the closing """
    # Pattern: scenario block with system_prompt
    pattern = f'"{scenario_key}"' + r'.*?"system_prompt":\s*"""(.*?)"""'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f'WARNING: Could not find {scenario_key} system_prompt')
        return content
    full_match = match.group(0)
    prompt_content = match.group(1)
    new_prompt = prompt_content.rstrip() + '\n' + extra
    new_full = full_match.replace('"""' + prompt_content + '"""', '"""' + new_prompt + '"""', 1)
    return content.replace(full_match, new_full, 1)

content = append_to_prompt(content, 'contact_center', CONTACT_CENTER_EXTRA)
content = append_to_prompt(content, 'legal', LEGAL_EXTRA)
content = append_to_prompt(content, 'healthcare', HEALTHCARE_EXTRA)
content = append_to_prompt(content, 'telco', TELCO_EXTRA)

open(f, 'w').write(content)

# Final token count
parts = content.split('"system_prompt"')
scenario_names = ['contact_center', 'legal', 'healthcare', 'telco']
print('Final token counts:')
for i, part in enumerate(parts[1:5], 0):
    match = re.search(r'"""(.*?)"""', part, re.DOTALL)
    if match:
        prompt = match.group(1).strip()
        chars = len(prompt)
        tokens = chars // 4
        kb = round(chars / 1024, 1)
        name = scenario_names[i] if i < len(scenario_names) else str(i)
        status = '✓' if tokens >= 6000 else '~'
        print(f'  {status} {name}: {chars:,} chars | ~{tokens:,} tokens | ~{kb} KB')

print('\nDone.')
