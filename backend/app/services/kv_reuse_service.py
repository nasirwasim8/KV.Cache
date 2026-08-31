"""
DDN KV Cache Observatory — KV Reuse Service
Demonstrates KV cache prefix reuse: cold vs warm inference TTFT comparison.
"""
import asyncio
import hashlib
import json
import time
import logging
from typing import AsyncGenerator, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Preset long-context documents ────────────────────────────────────────────
PRESET_DOCUMENTS = {
    "legal_contract": {
        "label": "Legal Contract",
        "icon": "⚖️",
        "system_prompt": """You are an expert legal analyst and contract review specialist at a major law firm. Carefully review the following enterprise Master Service Agreement and answer questions with precision, citing specific sections, clause numbers, and defined terms.

=== CONTRACT DOCUMENT ===
MASTER SERVICE AGREEMENT
Agreement No. MSA-2025-0042

This Master Service Agreement ("Agreement") is entered into as of January 1, 2025 ("Effective Date"), by and between Acme Corporation, a Delaware corporation with its principal place of business at 500 Enterprise Drive, Wilmington, Delaware 19801 ("Client"), and TechVendor Inc., a California corporation with its principal place of business at 1200 Technology Way, San Jose, California 95110 ("Provider"). Client and Provider are each referred to herein as a "Party" and collectively as the "Parties."

RECITALS
WHEREAS, Client desires to obtain certain technology infrastructure, cloud management, and professional services from Provider; WHEREAS, Provider has the expertise and resources to deliver such services on the terms set forth herein; NOW THEREFORE, in consideration of the mutual covenants, representations, warranties, and agreements hereinafter set forth, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

ARTICLE 1 — DEFINITIONS
1.1 "Affiliate" means any entity that directly or indirectly controls, is controlled by, or is under common control with a Party, where "control" means ownership of more than 50% of the voting securities of such entity. 1.2 "Confidential Information" means any non-public information disclosed by one Party to the other in connection with this Agreement that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and circumstances of disclosure, including but not limited to technical data, trade secrets, business plans, financial information, customer lists, and pricing. 1.3 "Documentation" means all technical manuals, user guides, API specifications, architecture diagrams, runbooks, and release notes provided by Provider in connection with the Services. 1.4 "Incident" means any unplanned interruption, degradation, or reduction in quality of a Service. Incidents are classified as Priority 1 (critical — complete service unavailability), Priority 2 (major — significant degradation), Priority 3 (moderate — partial impact), or Priority 4 (minor — cosmetic or informational). 1.5 "Intellectual Property Rights" means all patents, patent applications, copyrights, trademarks, service marks, trade secrets, moral rights, and all other proprietary rights recognized in any jurisdiction. 1.6 "Personal Data" means any information relating to an identified or identifiable natural person as defined under applicable data protection laws including the EU General Data Protection Regulation (GDPR 2016/679), the California Consumer Privacy Act (CCPA), and the Health Insurance Portability and Accountability Act (HIPAA) where applicable. 1.7 "Service Level Agreement" or "SLA" means the performance standards, measurement methodologies, and service credit remedies set forth in Schedule B. 1.8 "Statement of Work" or "SOW" means a document executed by both Parties describing a specific project, deliverables, timelines, and associated fees. 1.9 "Work Product" means any deliverables, software, documentation, or other materials created specifically for Client under a Statement of Work and paid for by Client.

ARTICLE 2 — SERVICES
2.1 Scope of Services. Provider agrees to deliver the following services ("Services") as further described in Schedule A: (a) Infrastructure Management Services — 24x7x365 monitoring, patch management, capacity planning, configuration management, and performance optimization across Client's hybrid cloud environment; (b) Cloud Optimization Services — cost analysis and attribution reporting, right-sizing recommendations, reserved instance management, multi-cloud governance frameworks, and monthly FinOps dashboards; (c) Data Storage and Management Services — distributed object storage provisioning, automated backup with verification, disaster recovery orchestration, data lifecycle management, and archival services; (d) AI/ML Infrastructure Services — GPU cluster provisioning and management, model serving optimization, KV cache management and tuning, inference pipeline optimization, and GPU utilization reporting; (e) Security Operations Services — continuous security monitoring, vulnerability scanning, threat intelligence feeds, SIEM integration, and compliance reporting; (f) Professional Services — solution architecture reviews, technology roadmap consulting, migration planning, and participation in Client's quarterly business reviews.
2.2 Service Standards. All Services must meet the SLA targets defined in Schedule B including: 99.99% monthly uptime for Tier 1 services; 99.95% monthly uptime for Tier 2 services; sub-100ms API response time at the 99th percentile; recovery time objective (RTO) of 4 hours for critical workloads; recovery point objective (RPO) of 1 hour; mean time to respond (MTTR-respond) of 15 minutes for Priority 1 Incidents; mean time to repair (MTTR-repair) of 4 hours for Priority 1 Incidents.
2.3 Change Management. Either Party may request changes to the scope of Services by submitting a written Change Order Request. Provider shall provide a detailed impact analysis including cost, timeline, and risk assessment within 5 business days. No change is effective until a Change Order is signed by authorized representatives of both Parties. Emergency changes required to maintain security or SLA compliance may be implemented immediately with retroactive documentation within 24 hours.
2.4 Subcontractors. Provider may engage subcontractors to perform portions of the Services provided that: (i) Provider notifies Client in advance; (ii) Provider remains fully responsible for all subcontractor performance; (iii) each subcontractor is bound by written confidentiality and data protection obligations no less stringent than those in this Agreement; and (iv) Provider shall not engage subcontractors that are on any applicable government sanctions list.

ARTICLE 3 — PAYMENT TERMS
3.1 Fees. Client shall pay Provider fees as set forth in Schedule C. Annual contract value for Year 1: $2,400,000 USD, payable in equal monthly installments of $200,000 due on the first business day of each calendar month. Year 2 and Year 3 fees shall be as set forth in Schedule C, subject to adjustment per Section 3.7.
3.2 Invoicing. Provider shall issue invoices by the 1st of each month for services rendered in that month. Each invoice shall include: itemized service category breakdown, consumption metrics and utilization summaries, any approved Change Order fees, expense reimbursements, applicable taxes, and invoice number and period.
3.3 Payment. Client shall pay all undisputed invoice amounts within 30 days of receipt. Payment shall be made by ACH transfer or wire transfer to Provider's designated bank account as specified in Schedule C. Provider shall provide remittance instructions with each invoice.
3.4 Late Payments. Undisputed amounts not paid by the due date shall accrue interest at the lesser of 1.5% per month (18% per annum) or the maximum rate permitted by applicable law, calculated from the payment due date until the date of actual payment. Provider shall provide written notice of late payment before assessing interest.
3.5 Disputed Invoices. Client must notify Provider in writing of any disputed invoice amounts within 15 days of receipt, specifying the disputed amount, affected line items, and the basis for the dispute. The Parties shall use good faith efforts to resolve disputes within 30 days of the dispute notice. Undisputed portions of invoices shall be paid by the original due date. Interest shall not accrue on disputed amounts during an active dispute resolution period.
3.6 Suspension for Non-Payment. Provider may suspend non-critical Services upon 30 days written notice if Client fails to pay undisputed amounts more than 60 days past due. Provider shall: (i) continue to maintain all Client data during any suspension period; (ii) provide at least 10 business days advance written notice before suspending any Tier 1 service; (iii) immediately restore Services upon receipt of overdue payment.
3.7 Annual Price Adjustment. Beginning on the second anniversary of the Effective Date, base fees may be adjusted annually by the lesser of 3% or the percentage change in the U.S. Consumer Price Index (CPI-U) for the preceding 12 months, with 90 days written notice prior to the adjustment effective date. Fee adjustments for professional services rates shall be negotiated in good faith.
3.8 Taxes. All fees are exclusive of applicable taxes, duties, and levies. Client is responsible for all sales, use, value-added, or similar taxes imposed on the Services, excluding taxes on Provider's net income.

ARTICLE 4 — PROVIDER OBLIGATIONS
4.1 Certifications and Compliance. Provider shall maintain throughout the term: ISO 27001:2022 (Information Security Management System); SOC 2 Type II covering Security, Availability, and Confidentiality trust service criteria; ISO 9001:2015 (Quality Management System); PCI DSS Level 1 Service Provider certification (if and when processing payment card data on behalf of Client); FedRAMP Moderate Authorization (if processing federal government data). Provider shall provide copies of current certification reports and audit attestations within 5 business days of written request, subject to applicable confidentiality obligations.
4.2 Dedicated Personnel. Provider shall: assign a dedicated Customer Success Manager (CSM) with minimum 5 years enterprise technology experience as primary relationship manager; designate a Technical Account Manager (TAM) as first-line escalation point for technical issues; maintain staffing levels sufficient to meet all SLA commitments; notify Client within 2 business days of any changes to CSM or TAM; conduct bi-weekly account calls and monthly executive steering committee meetings.
4.3 Incident Response. Provider shall: acknowledge Priority 1 Incidents within 15 minutes of detection or Client notification; provide status updates every 30 minutes via Provider's status portal and direct notification to Client's TPOC during active P1 Incidents; convene a bridge call within 30 minutes for all P1 Incidents; deliver a root cause analysis (RCA) report within 5 business days of P1 resolution including timeline, contributing factors, remediation steps, and preventive measures; conduct post-incident reviews within 10 business days.
4.4 Security Program. Provider shall: conduct quarterly penetration testing by an accredited third-party security firm approved by Client; perform monthly vulnerability scans of all systems processing Client data; implement multi-factor authentication (MFA) for all administrative and privileged access; maintain a written information security program (WISP) aligned with NIST Cybersecurity Framework (CSF) 2.0; conduct annual employee security awareness training; implement a formal vulnerability management program with defined SLAs for patch deployment based on CVSS severity score.
4.5 Business Continuity. Provider shall maintain and annually test a comprehensive Business Continuity Plan (BCP) and Disaster Recovery Plan (DRP). The DRP shall ensure RTO of 4 hours and RPO of 1 hour for all Tier 1 Client workloads. Provider shall conduct annual DR failover tests and invite Client to participate. Provider shall share current BCP and DRP documentation with Client upon request.
4.6 Reporting. Provider shall deliver: monthly Executive Summary Reports by the 10th of each following month including SLA performance metrics, Incident summaries, capacity utilization trends, cost optimization recommendations, and security posture summary; quarterly Business Reviews including strategic technology roadmap alignment, contract health, and upcoming milestone planning; annual Security Reports including penetration test executive summary, remediation status, and compliance certifications.

ARTICLE 5 — CLIENT OBLIGATIONS
5.1 Access and Cooperation. Client shall provide Provider with timely access to systems, networks, facilities, and personnel reasonably necessary for Provider to perform the Services. Client shall not unreasonably withhold, delay, or condition any approvals or authorizations required for Provider's performance.
5.2 Designated Personnel. Client shall designate and maintain: a primary Technical Point of Contact (TPOC) with day-to-day technical authority; an executive sponsor with authority to approve Change Orders above $50,000 and resolve executive escalations; an authorized signatory for contract amendments and SOW approvals; a data protection officer or privacy contact for all data-related matters.
5.3 Acceptable Use. Client shall not use the Services to: violate any applicable federal, state, local, or international law or regulation; infringe any third-party Intellectual Property Rights; transmit malicious code, malware, ransomware, or conduct distributed denial-of-service attacks; mine cryptocurrency without Provider's written consent; process data in jurisdictions where Provider has not been authorized to operate; or resell the Services to third parties without written authorization.
5.4 Payment Obligation. Client acknowledges that timely payment is a material obligation of this Agreement and that Provider's ability to meet SLA commitments is contingent in part upon Client's fulfillment of its payment obligations.
5.5 Accurate Information. Client shall provide accurate and complete information reasonably required by Provider to perform the Services, and shall promptly notify Provider of any material changes to Client's environment, usage patterns, or business requirements that may affect Service delivery.

ARTICLE 6 — DATA PROTECTION AND PRIVACY
6.1 Data Processing. Provider shall process Personal Data only on documented instructions from Client, only for the purposes of delivering the Services, and in strict accordance with applicable data protection and privacy laws including GDPR, CCPA, and HIPAA. Provider shall not process Personal Data for Provider's own commercial purposes.
6.2 Technical and Organizational Measures. Provider shall implement and maintain appropriate technical and organizational security measures including: AES-256 encryption for all Personal Data at rest; TLS 1.3 or higher for all Personal Data in transit; role-based access control (RBAC) with least privilege principles enforced for all personnel accessing Client data; data loss prevention (DLP) controls; immutable, tamper-evident audit logs retained for minimum 7 years; regular access reviews and certification conducted quarterly; privileged access management (PAM) solution for all administrative access.
6.3 Data Residency and Transfer. All Client data shall be stored, processed, and backed up exclusively within data centers located in the continental United States unless Client provides prior written consent for cross-border transfers. For any approved cross-border transfers, Provider shall implement EU Standard Contractual Clauses (SCCs) or other appropriate transfer mechanisms. Provider shall maintain and make available to Client a current registry of all data center locations.
6.4 Breach Notification. Provider shall notify Client's designated privacy contact within 24 hours of becoming aware of any confirmed or reasonably suspected Personal Data breach affecting Client's data. Provider shall deliver a detailed incident report within 72 hours of initial notification including: nature and classification of the breach; categories and approximate volume of individuals and data records affected; likely consequences of the breach; measures taken and proposed to address the breach and mitigate its possible adverse effects; status of regulatory notification obligations.
6.5 Data Subject Rights. Provider shall assist Client in responding to data subject rights requests (access, rectification, erasure, portability, objection) within the timeframes required by applicable law, typically within 30 days of the request.
6.6 Data Deletion and Return. Upon termination or expiration of this Agreement, Provider shall: make all Client data available for export in standard machine-readable format within 10 business days; securely delete or destroy all Client data and copies thereof within 30 days of data export confirmation; provide written certification of secure deletion including the method used. Provider shall retain data solely to the extent required by applicable law and shall notify Client of any such retention.
6.7 Data Processing Agreement. The Parties shall execute a separate Data Processing Agreement (DPA) as required under applicable data protection laws, which is incorporated herein by reference. In the event of any conflict between the DPA and this Agreement with respect to data protection matters, the DPA shall control.
6.8 Third-Party Audits. Client may, upon 30 days written notice and no more than once per calendar year, commission a third-party audit of Provider's data protection practices at Client's expense. Provider shall cooperate fully with such audits and provide auditors with reasonable access to relevant systems, policies, and personnel.

ARTICLE 7 — CONFIDENTIALITY
7.1 Obligations. Each Party ("Receiving Party") shall: hold all Confidential Information of the other Party ("Disclosing Party") in strict confidence using at least the same degree of care as it uses to protect its own most sensitive confidential information, but in no event less than reasonable care; not disclose Confidential Information to any third party without prior written consent of the Disclosing Party; use Confidential Information solely for purposes of performing obligations or exercising rights under this Agreement; limit disclosure to those employees, contractors, and advisors with a need to know who are bound by confidentiality obligations at least as protective as those herein.
7.2 Exceptions. Confidentiality obligations do not apply to information that: is or becomes publicly known through no act or omission of the Receiving Party; was rightfully known to the Receiving Party prior to disclosure without restriction; is received from a third party without restriction on disclosure; is independently developed by the Receiving Party without use of or reference to Confidential Information; or is required to be disclosed by applicable law, regulation, or court order, provided the Receiving Party gives prompt advance notice and reasonably cooperates with the Disclosing Party in seeking protective relief.
7.3 Survival. Confidentiality obligations survive expiration or termination of this Agreement for a period of 5 years, except that obligations with respect to trade secrets shall continue for so long as the information constitutes a trade secret under applicable law.
7.4 Remedies. Each Party acknowledges that breach of this Article would cause irreparable harm for which monetary damages would be an inadequate remedy, and that the non-breaching Party shall be entitled to seek equitable relief including injunctions and specific performance without posting bond.

ARTICLE 8 — INTELLECTUAL PROPERTY
8.1 Pre-Existing IP. All Intellectual Property Rights in materials developed prior to or independently of this Agreement ("Pre-Existing IP") remain the exclusive property of the developing Party. Provider's proprietary software, platforms, tools, methodologies, frameworks, and know-how are Provider's Pre-Existing IP. Client's data, business processes, systems, and brand assets are Client's Pre-Existing IP. Nothing herein transfers ownership of Pre-Existing IP.
8.2 Work Product Ownership. Intellectual Property Rights in Work Product created specifically for Client under a signed Statement of Work and fully paid for by Client shall be assigned to and owned by Client upon receipt of full payment. Provider shall execute any documents reasonably required to effectuate such assignment. Provider retains a perpetual, irrevocable, royalty-free, worldwide license to use anonymized, aggregated derivatives of Work Product for internal product development and improvement.
8.3 License Grants. Provider grants Client a limited, non-exclusive, non-transferable, non-sublicensable license to access and use Provider's software, tools, and platforms solely as necessary to receive the Services during the Term. Client grants Provider a limited, non-exclusive license to use Client's systems, data, and materials solely as necessary to provide the Services under this Agreement.
8.4 Feedback. Client may provide optional feedback, suggestions, or enhancement requests regarding the Services. Provider may use such feedback to improve its products and services without any obligation to Client and without restriction, provided no attribution to Client is made without consent.

ARTICLE 9 — LIMITATION OF LIABILITY
9.1 Aggregate Liability Cap. Each Party's total aggregate liability to the other Party arising out of or related to this Agreement, regardless of the form of action or theory of liability, shall not exceed the total fees paid or payable by Client to Provider in the 12-month period immediately preceding the event or first occurrence giving rise to the claim.
9.2 Exclusion of Consequential Damages. NEITHER PARTY SHALL BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, LOSS OF REVENUE, LOSS OF BUSINESS, LOSS OF GOODWILL, LOSS OF DATA, COST OF SUBSTITUTE SERVICES, OR BUSINESS INTERRUPTION, REGARDLESS OF THE THEORY OF LIABILITY AND EVEN IF SUCH PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
9.3 Liability Cap Exceptions. The limitations in Sections 9.1 and 9.2 shall NOT apply to: (a) damages resulting from gross negligence or willful misconduct; (b) breaches of Article 7 (Confidentiality); (c) Personal Data breaches caused by Provider's failure to implement required security measures; (d) infringement of the other Party's Intellectual Property Rights; (e) each Party's indemnification obligations under Article 10; or (f) Client's payment obligations under Article 3.
9.4 Essential Basis. The Parties acknowledge that the limitations in this Article reflect a reasonable allocation of risk and are an essential element of the basis of the bargain between the Parties.

ARTICLE 10 — INDEMNIFICATION
10.1 Provider Indemnification. Provider shall indemnify, defend, and hold harmless Client and its officers, directors, employees, and agents from and against any third-party claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney fees) arising from or related to: (a) Provider's material breach of this Agreement; (b) infringement or misappropriation of any third-party Intellectual Property Rights by the Services as provided and used in accordance with this Agreement; (c) Provider's gross negligence or willful misconduct; (d) any Personal Data breach caused by Provider's failure to implement required security measures; or (e) Provider's violation of applicable law.
10.2 Client Indemnification. Client shall indemnify, defend, and hold harmless Provider and its officers, directors, employees, and agents from and against any third-party claims arising from: (a) Client's use of the Services in material violation of this Agreement; (b) Client's violation of applicable law; (c) Client data that infringes third-party rights; or (d) Client's gross negligence or willful misconduct.
10.3 Indemnification Procedure. The indemnified Party shall: promptly notify the indemnifying Party of any claim (provided failure to give prompt notice shall not relieve indemnifying Party of obligations except to the extent of actual prejudice); grant the indemnifying Party sole control of the defense and settlement (provided no settlement imposing liability on the indemnified Party is made without consent); and provide reasonable cooperation at indemnifying Party's expense.

ARTICLE 11 — TERM AND TERMINATION
11.1 Initial Term. This Agreement commences on the Effective Date and continues for an initial term of 3 years ending December 31, 2027 ("Initial Term"), unless earlier terminated pursuant to this Article.
11.2 Automatic Renewal. Following the Initial Term, this Agreement automatically renews for successive 1-year periods ("Renewal Terms") unless either Party provides written notice of non-renewal at least 90 days before the end of the then-current term. The Initial Term and all Renewal Terms are collectively referred to as the "Term."
11.3 Termination for Convenience. Either Party may terminate this Agreement without cause upon 90 days prior written notice to the other Party. In the event of Client's termination for convenience, Client shall pay all fees accrued through the termination effective date plus an early termination fee equal to 3 months of then-current monthly fees.
11.4 Termination for Cause. Either Party may terminate this Agreement immediately upon written notice if the other Party: (a) materially breaches this Agreement and fails to cure such breach within 30 days of written notice specifying the breach in reasonable detail; (b) becomes insolvent, makes a general assignment for the benefit of creditors, or is subject to voluntary or involuntary bankruptcy proceedings not dismissed within 60 days; (c) ceases to conduct business in the ordinary course; or (d) is subject to a change of control involving a direct competitor of the non-assigning Party.
11.5 Effect of Termination. Upon expiration or termination: (a) all licenses granted hereunder immediately terminate; (b) Provider shall deliver all Client data within 10 business days in machine-readable standard format at no additional charge; (c) each Party shall promptly return or certifiably destroy all Confidential Information of the other Party; (d) Client shall pay all undisputed outstanding fees through the termination effective date; (e) any accrued rights and obligations, and provisions that by their nature should survive, shall survive termination.
11.6 Transition Assistance. Upon request, Provider shall provide transition assistance for up to 90 days following termination at Provider's then-current professional services rates, including knowledge transfer, data migration assistance, and reasonable cooperation with Client's new service provider.

ARTICLE 12 — BUSINESS CONTINUITY AND DISASTER RECOVERY
12.1 BCP/DRP Maintenance. Provider shall maintain and annually test a comprehensive, documented Business Continuity Plan (BCP) and Disaster Recovery Plan (DRP) covering all Services and systems used to deliver Services to Client. Testing shall include full failover exercises for all Tier 1 services.
12.2 RTO/RPO Targets. The DRP shall ensure recovery time objective (RTO) of 4 hours and recovery point objective (RPO) of 1 hour for all Tier 1 Client workloads, and RTO of 8 hours and RPO of 4 hours for Tier 2 workloads.
12.3 Disaster Notification. In the event of a declared disaster affecting Services, Provider shall: notify Client within 1 hour of invoking the DRP; provide hourly status updates during active DR events; notify Client when normal operations are restored; deliver a post-event report within 10 business days.
12.4 Documentation and Testing. Provider shall share current BCP and DRP documentation with Client upon request (subject to confidentiality redactions for multi-tenant information) and invite Client to participate in annual DR testing exercises as an observer.

ARTICLE 13 — INSURANCE
Provider shall procure and maintain throughout the Term, at its own expense, the following minimum insurance coverage with insurers having an A.M. Best rating of A- VII or better: (a) Commercial General Liability: $5,000,000 per occurrence and $10,000,000 aggregate; (b) Cyber Liability and Technology E&O: $10,000,000 per occurrence covering data breaches, network security failures, privacy liability, and media liability; (c) Professional Liability (Errors & Omissions): $5,000,000 per claim and aggregate; (d) Workers' Compensation: statutory limits as required by applicable law; (e) Employer's Liability: $1,000,000 per occurrence; (f) Commercial Auto: $1,000,000 combined single limit (if applicable). Client shall be named as an additional insured on CGL and Cyber policies. Provider shall provide certificates of insurance within 5 business days of written request and shall notify Client at least 30 days before any material change or cancellation of coverage.

ARTICLE 14 — DISPUTE RESOLUTION
14.1 Escalation — Account Managers. Disputes shall first be submitted to each Party's designated account managers who shall use good faith efforts to resolve the dispute within 15 business days of written notice identifying the dispute.
14.2 Escalation — Executives. If unresolved at the account manager level, disputes shall be escalated to the designated executive sponsors of each Party who shall use good faith efforts to resolve the dispute within 30 business days.
14.3 Mediation. If executive escalation fails, the Parties shall submit the dispute to non-binding mediation administered by JAMS in Wilmington, Delaware, before a single mediator mutually agreed upon by the Parties. Mediation costs shall be shared equally.
14.4 Binding Arbitration. If mediation fails to resolve the dispute within 30 days, the dispute shall be submitted to binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules and Supplementary Procedures for Large Complex Disputes. Arbitration shall be conducted in Wilmington, Delaware before a single arbitrator with demonstrated expertise in technology contracts. The arbitrator's award shall be final, binding, and non-appealable except as provided by the Federal Arbitration Act, and may be confirmed and entered as a judgment in any court of competent jurisdiction.
14.5 Governing Law. This Agreement, and all disputes arising hereunder, shall be governed by the laws of the State of Delaware, without regard to its conflict of laws principles or the United Nations Convention on Contracts for the International Sale of Goods.
14.6 Injunctive Relief. Notwithstanding the foregoing, either Party may seek emergency injunctive or other equitable relief in a court of competent jurisdiction to prevent irreparable harm pending arbitration, particularly with respect to confidentiality breaches or Intellectual Property infringement.
14.7 Attorney Fees. The prevailing Party in any arbitration or litigation arising from this Agreement shall be entitled to recover reasonable attorney fees, expert fees, and costs from the non-prevailing Party.

ARTICLE 15 — GENERAL PROVISIONS
15.1 Force Majeure. Neither Party shall be liable for delays or failures in performance to the extent caused by circumstances beyond its reasonable control, including natural disasters, acts of God, acts of government or regulatory authorities, pandemic or epidemic, war or terrorism, labor disputes not involving that Party's own employees, or third-party infrastructure failures beyond that Party's reasonable control. The affected Party shall: provide prompt written notice identifying the force majeure event and expected duration; use commercially reasonable efforts to minimize the impact and resume performance; provide weekly updates on status. If a force majeure event continues for more than 60 days, the unaffected Party may terminate this Agreement upon 30 days written notice without penalty.
15.2 Entire Agreement. This Agreement, including all Schedules, Exhibits, Statements of Work, and the Data Processing Agreement, constitutes the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior and contemporaneous negotiations, representations, warranties, and agreements, whether oral or written, relating to the subject matter.
15.3 Amendments. No amendment, modification, or supplement to this Agreement shall be valid or binding unless made in writing and signed by authorized representatives of both Parties. No course of dealing, usage of trade, or course of performance shall be used to interpret or modify this Agreement.
15.4 Severability. If any provision of this Agreement is held by a court or arbitrator to be invalid, illegal, or unenforceable under applicable law, such provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.
15.5 Waiver. No failure or delay by either Party in exercising any right under this Agreement shall constitute a waiver of such right. No single or partial exercise of any right shall preclude any other or further exercise thereof or the exercise of any other right. No waiver shall be effective unless made in writing by an authorized representative.
15.6 Notices. All notices, requests, demands, and other communications under this Agreement shall be in writing and delivered by: (a) certified or registered mail, return receipt requested; (b) nationally recognized overnight courier with tracking; or (c) email with read receipt confirmation to the email addresses designated by each Party on the signature page. Notices are effective upon delivery.
15.7 Assignment. Neither Party may assign, transfer, or delegate any of its rights or obligations under this Agreement without the prior written consent of the other Party, which shall not be unreasonably withheld. Notwithstanding the foregoing, either Party may assign this Agreement without consent to: (a) an Affiliate; (b) a successor entity in connection with a merger, acquisition, reorganization, or sale of all or substantially all of its business or assets to which this Agreement relates, provided the assignee assumes all obligations hereunder.
15.8 Counterparts and Electronic Signatures. This Agreement may be executed in counterparts, each of which shall be deemed an original, and all of which together shall constitute one and the same instrument. Electronic signatures (including PDF and DocuSign) shall be deemed valid and binding.
15.9 No Third-Party Beneficiaries. This Agreement is for the sole benefit of the Parties and their permitted assigns. Nothing in this Agreement, express or implied, is intended to or shall confer any rights, benefits, or remedies upon any third party.
15.10 Relationship of Parties. The Parties are independent contractors. Nothing in this Agreement creates a partnership, joint venture, agency, franchise, or employment relationship between the Parties.
=== END CONTRACT ===""",
        "sample_questions": [
            "What are Provider's key obligations in Section 3?",
            "What is the payment term and what happens if payments are late?",
            "How is liability limited under this agreement?",
            "What is the termination notice period?",
        ]
    },
    "medical_report": {
        "label": "Medical Report",
        "icon": "🏥",
        "system_prompt": (
            "You are an expert medical records analyst. Review the following patient case report "
            "and answer clinical questions accurately. Always note any critical findings.\n\n"
            "=== PATIENT CASE REPORT ===\n"
            "Patient: John Doe | DOB: 1965-03-15 | MRN: 4829301\n"
            "Attending Physician: Dr. Sarah Chen, MD, Cardiology\n"
            "Admission Date: 2025-06-10 | Discharge: 2025-06-17\n\n"
            "CHIEF COMPLAINT: Chest pain with exertion, shortness of breath x 3 weeks.\n\n"
            "HISTORY OF PRESENT ILLNESS:\n"
            "60-year-old male with history of Type 2 diabetes (HbA1c 7.8%), hypertension, "
            "hyperlipidemia, and 30 pack-year smoking history (quit 2010). Presents with "
            "progressive exertional chest pain and dyspnea. Denies rest pain, orthopnea, PND. "
            "Reports reduced exercise tolerance from 3 blocks to less than 1 block over 3 weeks.\n\n"
            "DIAGNOSTIC WORKUP:\n"
            "ECG: Normal sinus rhythm, T-wave inversions V4-V6. Troponin I: 0.04 ng/mL (elevated). "
            "Echo: EF 45%, anterior wall hypokinesis, grade II diastolic dysfunction. "
            "Stress test: 6 METs, ST depression 2mm in leads V4-V6 at 85% max HR. "
            "Coronary angiography: 85% LAD stenosis (proximal), 60% RCA stenosis (mid).\n\n"
            "DIAGNOSIS: NSTEMI, CAD 2-vessel disease.\n\n"
            "TREATMENT:\n"
            "Emergency PCI: Drug-eluting stent placed in LAD. Medical management for RCA. "
            "Medications on discharge: Aspirin 81mg daily, Ticagrelor 90mg BID x 12 months, "
            "Atorvastatin 80mg daily, Lisinopril 10mg daily, Metoprolol succinate 50mg daily, "
            "Metformin 1000mg BID (diabetes management). "
            "Cardiac rehab referral. Follow-up 2 weeks.\n\n"
            "ALLERGIES: Penicillin (rash), Sulfa drugs (anaphylaxis).\n"
            "=== END REPORT ==="
        ),
        "sample_questions": [
            "What was the primary diagnosis and which vessel was most critically affected?",
            "What medications was the patient discharged on and why?",
            "What were the key diagnostic findings that led to PCI?",
            "Does this patient have any medication allergies to note?",
        ]
    },
    "technical_manual": {
        "label": "Technical Manual",
        "icon": "🔧",
        "system_prompt": (
            "You are a senior systems engineer and technical documentation expert. "
            "Review the following infrastructure manual and answer configuration questions.\n\n"
            "=== DDN INFINIA STORAGE SYSTEM — TECHNICAL REFERENCE ===\n\n"
            "ARCHITECTURE OVERVIEW\n"
            "DDN Infinia is a distributed object storage system optimized for AI workloads. "
            "It provides S3-compatible API access with native NIXL (NVIDIA Inference Transfer Library) "
            "integration for GPU-direct KV cache offloading.\n\n"
            "CLUSTER CONFIGURATION\n"
            "Minimum cluster: 3 storage nodes for HA. Each node: 2x 25GbE or 1x 100GbE. "
            "Recommended: RoCE v2 for RDMA KV cache transfers. "
            "Storage pools: SYSTEM (SSD tier), DATA (HDD tier), CACHE (NVMe tier).\n\n"
            "KVCACHE DATASET SETUP\n"
            "1. Enable feature: redcli cluster tunable kvcache enable -f\n"
            "2. Create dataset: redcli dataset create <name> -f kvcache\n"
            "3. Default profile DEFAULT_KVCACHE_1: block_size=4KiB, bucket_size=512KiB, "
            "dir_nstripes=128, dp_profile=2.\n"
            "4. NIXL plugin path: /opt/ddn/red/lib/libred_client.so\n\n"
            "NIXL INTEGRATION\n"
            "Supported backends: INFINIA (primary), GDS, POSIX, UCX, LIBFABRIC.\n"
            "LMCache config (nixl-llama-gpu.yaml):\n"
            "  chunk_size: 256\n"
            "  local_cpu: 0\n"
            "  remote_url: nixl://\n"
            "  enable_kv_cache_events: true\n"
            "vLLM launch: LD_PRELOAD=libred_client.so:libred_async.so \\\n"
            "  LMCACHE_CONFIG_FILE=nixl-llama-gpu.yaml \\\n"
            "  python3 -m dynamo.vllm --kv-transfer-config '{\"kv_connector\":\"LMCacheConnector\"}'\n\n"
            "PERFORMANCE TUNING\n"
            "Network buffers: net.ipv4.tcp_rmem=4096 131072 8388608\n"
            "net.core.rmem_max=8388608\n"
            "KV cache memory: --kv-cache-memory-bytes 12g\n"
            "Max batched tokens: --max-num-batched-tokens 8192\n"
            "=== END MANUAL ==="
        ),
        "sample_questions": [
            "How do I enable KVCache on an Infinia cluster?",
            "What is the DEFAULT_KVCACHE_1 profile block size?",
            "What LD_PRELOAD libraries are needed to run Dynamo with Infinia?",
            "What network buffer settings are recommended?",
        ]
    }
}


async def run_inference(
    endpoint_url: str,
    model: str,
    system_prompt: str,
    question: str,
    timeout: float = 120.0,
) -> tuple[float, float, str]:
    """
    Call the inference endpoint. Returns (ttft_ms, total_ms, response_text).
    Measures TTFT by timing to first streaming chunk.
    """
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        "max_tokens": 300,
        "stream": True,
        "temperature": 0.1,
    }

    start = time.perf_counter()
    ttft_ms = -1.0
    response_text = ""

    try:
        async with httpx.AsyncClient(verify=False, timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{endpoint_url.rstrip('/')}/v1/chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"},
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    chunk = line[6:]
                    if chunk.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        delta = data["choices"][0]["delta"].get("content", "")
                        if delta:
                            if ttft_ms < 0:
                                ttft_ms = (time.perf_counter() - start) * 1000
                            response_text += delta
                    except Exception:
                        pass
    except (httpx.ConnectError, httpx.ConnectTimeout) as e:
        # Let these propagate so the caller can yield a proper error event
        raise
    except Exception as e:
        total_ms = (time.perf_counter() - start) * 1000
        return ttft_ms if ttft_ms >= 0 else total_ms, total_ms, f"[Error: {e}]"

    total_ms = (time.perf_counter() - start) * 1000
    return ttft_ms, total_ms, response_text


async def stream_reuse_comparison(
    endpoint_url: str,
    model: str,
    preset_key: str,
    custom_question: str = "",
    run_without_cache: bool = True,
) -> AsyncGenerator[str, None]:
    """
    SSE generator for the KV reuse proof demo.
    Runs cold (no cache) and warm (with cache) inference, yields events.

    Event types:
      {"type": "status",   "phase": "cold"|"warm",  "message": "..."}
      {"type": "token",    "phase": "cold"|"warm",  "text": "..."}
      {"type": "ttft",     "phase": "cold"|"warm",  "ttft_ms": X, "total_ms": Y}
      {"type": "summary",  "cold_ttft_ms": X, "warm_ttft_ms": Y, "speedup": Z}
      {"type": "error",    "message": "..."}
    """

    def sse(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    preset = PRESET_DOCUMENTS.get(preset_key)
    if not preset:
        yield sse({"type": "error", "message": f"Unknown preset: {preset_key}"})
        return

    question = custom_question.strip() if custom_question.strip() else preset["sample_questions"][0]
    system_prompt = preset["system_prompt"]

    # ── COLD RUN ──────────────────────────────────────────────────────────────
    yield sse({"type": "status", "phase": "cold", "message": "Starting cold inference (no cached KV)..."})
    yield sse({"type": "status", "phase": "warm", "message": "Waiting for cold run to complete first..."})

    try:
        cold_ttft, cold_total, cold_text = await run_inference(
            endpoint_url, model, system_prompt, question
        )
        yield sse({"type": "ttft", "phase": "cold", "ttft_ms": round(cold_ttft), "total_ms": round(cold_total)})
        yield sse({"type": "response", "phase": "cold", "text": cold_text})
    except (httpx.ConnectError, httpx.ConnectTimeout):
        yield sse({
            "type": "error",
            "message": "vLLM is not running",
            "detail": f"Cannot connect to vLLM at {endpoint_url}. Start vLLM with: VLLM_USE_FLASHINFER_SAMPLER=0 python -m vllm.entrypoints.openai.api_server --model ~/models/Llama-3.1-8B-Instruct --enable-prefix-caching --port 11000",
            "code": "VLLM_NOT_RUNNING"
        })
        return
    except Exception as e:
        yield sse({"type": "error", "message": f"Cold run failed: {e}"})
        return

    # Small delay between runs
    await asyncio.sleep(0.5)

    # ── WARM RUN (same prefix — should hit KV cache) ──────────────────────────
    yield sse({"type": "status", "phase": "warm", "message": "Starting warm inference (KV cache should hit)..."})

    try:
        warm_ttft, warm_total, warm_text = await run_inference(
            endpoint_url, model, system_prompt, question
        )
        yield sse({"type": "ttft", "phase": "warm", "ttft_ms": round(warm_ttft), "total_ms": round(warm_total)})
        yield sse({"type": "response", "phase": "warm", "text": warm_text})
    except (httpx.ConnectError, httpx.ConnectTimeout):
        yield sse({
            "type": "error",
            "message": "vLLM is not running",
            "detail": f"Cannot connect to vLLM at {endpoint_url}. Start vLLM from your WSL terminal.",
            "code": "VLLM_NOT_RUNNING"
        })
        return
    except Exception as e:
        yield sse({"type": "error", "message": f"Warm run failed: {e}"})
        return

    # ── SUMMARY ───────────────────────────────────────────────────────────────
    if cold_ttft > 0 and warm_ttft > 0:
        speedup = round(cold_ttft / warm_ttft, 1) if warm_ttft > 0 else 0

        # ── KV / Infinia metadata ───────────────────────────────────────────
        # Compute deterministic prefix hash (what NIXL/LMCache uses as the cache key)
        prefix_hash = hashlib.sha256(system_prompt.encode()).hexdigest()

        # Approximate token count (tiktoken not available, use word*1.33 heuristic)
        prefix_tokens = int(len(system_prompt.split()) * 1.33)
        question_tokens = max(1, int(len(question.split()) * 1.33))

        # Llama 3.1 8B KV tensor size per token (fp16, GQA: 8 KV heads, head_dim=128, 32 layers)
        # Per token = 2 (K+V) × 8 KV heads × 128 head_dim × 2 bytes × 32 layers = 131,072 bytes
        bytes_per_token = 2 * 8 * 128 * 2 * 32   # 131,072 bytes = 128 KB
        kv_bytes = prefix_tokens * bytes_per_token
        kv_mb = round(kv_bytes / (1024 * 1024), 1)

        # vLLM paged attention blocks: default block_size = 16 tokens
        block_size = 16
        block_count = (prefix_tokens + block_size - 1) // block_size

        yield sse({
            "type": "summary",
            "cold_ttft_ms":      round(cold_ttft),
            "warm_ttft_ms":      round(warm_ttft),
            "cold_total_ms":     round(cold_total),
            "warm_total_ms":     round(warm_total),
            "speedup":           speedup,
            "tokens_in_context": prefix_tokens,
            "preset":            preset_key,
            "infinia": {
                "prefix_hash":           prefix_hash[:24],
                "prefix_hash_full":      prefix_hash,
                "prefix_tokens":         prefix_tokens,
                "question_tokens":       question_tokens,
                "kv_size_mb":            kv_mb,
                "kv_size_bytes":         kv_bytes,
                "block_count":           block_count,
                "block_size":            block_size,
                "layers":                32,
                "kv_heads":              8,
                "head_dim":              128,
                "dtype":                 "fp16",
                "model":                 "Llama-3.1-8B-Instruct",
                "bucket":                settings.infinia_bucket,
                "endpoint":              settings.infinia_endpoint or "192.168.147.129:8111",
                "transfer_mode":         "NIXL \u2192 DDN Infinia" if settings.infinia_endpoint else "GPU HBM Prefix Cache",
                "object_key":            f"kvcache/{prefix_hash[:24]}.bin",
                "gpu_compute_saved_pct": round(prefix_tokens / (prefix_tokens + question_tokens) * 100, 1),
            },
        })
