import { SITE } from "@/config/site";

/**
 * Legal documents for MagariSOKO Tanzania (operated by Jatelo Technologies), in
 * English and Kiswahili. Written for Tanzanian law: the Personal Data Protection
 * Act, 2022, the Electronic Transactions Act, 2015, the Cybercrimes Act, 2015 and
 * the Fair Competition Act, 2003.
 *
 * Bump SITE.legalUpdated whenever these texts change: users who accepted an
 * older version are recorded in User.termsVersion.
 */

export type LegalBlock = string | { list: string[] };
export type LegalSection = { id: string; heading: string; body: LegalBlock[] };
export type LegalDoc = { title: string; summary: string; sections: LegalSection[] };
export type LegalKey = "terms" | "privacy" | "safety";

const B = SITE.fullName;
const N = SITE.name;
const C = SITE.company;

/* ═════════════════════════════════ ENGLISH ═════════════════════════════════ */

const termsEn: LegalDoc = {
  title: "Terms of Use",
  summary: `These terms govern your use of ${B}, an online marketplace operated by ${C} that connects buyers and sellers of vehicles and spare parts, and providers of automotive services, across Tanzania.`,
  sections: [
    {
      id: "acceptance",
      heading: "1. Who we are and accepting these terms",
      body: [
        `${B} ("we", "us") is a product of ${C}. By creating an account, signing in, posting a listing, sending an inquiry or otherwise using the website, you agree to these Terms of Use, our Privacy Policy and our Safety Policy. If you do not agree, do not use ${N}.`,
        "If you use the platform for a business (a dealership, importer, parts store, garage or other service provider), you confirm that you are authorised to accept these terms on its behalf, and that the business is bound by them.",
      ],
    },
    {
      id: "role",
      heading: `2. ${N} is a marketplace, not a seller`,
      body: [
        `${N} provides a platform where sellers advertise and buyers find and contact them. We are not a party to any sale, purchase, service agreement, financing arrangement or import order made between users. We do not own, inspect, store, import, deliver or guarantee the vehicles, parts or services listed.`,
        "The contract for a vehicle, part or service is between the buyer and the seller or provider only. They alone are responsible for its price, condition, payment, transfer of ownership, registration with the Tanzania Revenue Authority (TRA), delivery, warranties and after-sales obligations.",
      ],
    },
    {
      id: "eligibility",
      heading: "3. Eligibility and accounts",
      body: [
        { list: [
          "You must be at least 18 years old and able to enter into a binding contract under Tanzanian law.",
          "You must give accurate information and keep your phone number, email and business details up to date.",
          "You are responsible for everything done through your account. Keep your password and SMS codes private, and tell us immediately if you suspect unauthorised use.",
          "One person may hold one personal account. Businesses may add staff as members of their business profile.",
          "We may verify identities, phone numbers and business documents (such as a TIN or BRELA registration). A verified badge confirms only that we checked those documents. It is not a guarantee of any transaction.",
        ] },
      ],
    },
    {
      id: "listings",
      heading: "4. Listing rules",
      body: [
        "When you post a listing you confirm that:",
        { list: [
          "you own the vehicle or part, or are authorised by the owner to sell it, and it is free from undisclosed loans, liens, court orders or other claims;",
          "the vehicle or part is not stolen, smuggled, counterfeit or otherwise illegal to sell in Tanzania;",
          "the photos show the actual item, and the description, year, mileage, condition, price and location are true and complete;",
          "for import-on-order listings, the FOB, freight, origin and delivery estimates are honest, and you will tell the buyer clearly about any change before they pay;",
          "you will update or remove the listing promptly once the item is sold or no longer available.",
        ] },
        "We review listings and may edit their formatting, or refuse, suspend or remove any listing that breaks these terms or that we reasonably believe could mislead or harm users. Listings expire after the period shown on our pricing page unless you renew them.",
      ],
    },
    {
      id: "prohibited",
      heading: "5. Prohibited conduct",
      body: [
        "You must not:",
        { list: [
          "post false, duplicate, bait-and-switch or misleading listings, or prices you do not intend to honour;",
          "ask buyers for deposits, \"booking fees\" or advance payments before they have inspected the item, or ask them to pay a third party;",
          "impersonate another person, dealer, bank, government office or MagariSOKO Tanzania staff;",
          "harvest phone numbers or other users' data, send spam, or contact users for purposes unrelated to their listing;",
          "use bots, scrapers or automated tools to copy content or overload the service;",
          "upload content that is unlawful, defamatory, hateful, sexually explicit, or that infringes someone else's intellectual property or privacy;",
          "attempt to bypass our fees, security features or moderation, or commit any offence under the Cybercrimes Act, 2015.",
        ] },
      ],
    },
    {
      id: "fees",
      heading: "6. Fees and payments",
      body: [
        `Browsing and contacting sellers are free. Every private seller, dealership, car yard, importer, spare-parts shop and service provider pays a one-off registration fee of TSh ${SITE.registrationFeeTzs.toLocaleString("en-US")} before they can post. Our team verifies the payment before approving the registration; only after approval is the registration successful and the seller's mini-site created. There is no per-listing fee. Optional fees apply to promotions (Featured, Sponsored, Bump, Homepage spotlight), to monthly business plans and to advertising. Prices are shown in Tanzanian Shillings (TZS) on the pricing page, are inclusive of any applicable taxes unless stated otherwise, and are confirmed before you pay.`,
        "Every vehicle, spare part and service must show its price in TZS. Every vehicle listing must also state the year of manufacture, make, model, mileage, fuel type, transmission and whether it is brand new, foreign used or locally used. Listings missing these details are not published.",
        "Payments are processed by licensed third-party payment providers (such as AzamPay, Selcom and DPO Pay) using mobile money (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, AzamPesa) or card. We do not store your mobile-money PIN or card details.",
        { list: [
          "A promotion starts as soon as payment is confirmed and runs for the period purchased. Fees are non-refundable once the promotion or subscription period has started, except where required by law or where the service was not provided because of our error.",
          "If a listing is removed for breaking these terms, any fees paid for it are not refunded.",
          "The registration fee is non-refundable once the registration is approved. If we cannot verify a payment, we reject it and tell you why so you can correct it; a payment that never reached us is not charged twice.",
          "Subscriptions renew only when you pay again. An unpaid subscription ends at the end of its period and your listings fall back to the limit included with your registration.",
        ] },
        "MagariSOKO Tanzania does not hold or transfer the purchase price of vehicles or parts between buyers and sellers.",
      ],
    },
    {
      id: "content",
      heading: "7. Your content and our intellectual property",
      body: [
        `You keep ownership of the photos and text you upload. You give ${C} a non-exclusive, royalty-free, worldwide licence to host, display, resize, watermark and promote that content on ${N} and in our marketing (including social media and search engines) for as long as it is on the platform, and for a reasonable time afterwards in backups and archives.`,
        `The ${N} name, logo, design, software, databases and compilations of listings are the property of ${C} and are protected by copyright and other laws. You may not copy, scrape, resell or create derivative works from them without our written permission.`,
      ],
    },
    {
      id: "estimates",
      heading: "8. Estimates, calculators and third-party information",
      body: [
        "Landed-cost (import duty, excise, VAT and levies), exchange-rate and financing figures are estimates for guidance only. The actual amounts are set by TRA at clearance, by your bank or lender, and by the market on the day. Always confirm with TRA, a licensed clearing agent or your lender before making a decision.",
        "Reviews, ratings, business information and links to third-party websites are provided by users or third parties. We do not endorse them and are not responsible for their accuracy.",
      ],
    },
    {
      id: "liability",
      heading: "9. Disclaimers and limitation of liability",
      body: [
        `${N} is provided "as is" and "as available". To the fullest extent permitted by Tanzanian law, we give no warranty that listings are accurate, that users are who they say they are, or that the service will be uninterrupted or error-free.`,
        `To the extent permitted by law, ${C} is not liable for any loss arising from transactions between users, from fraud by another user, or from indirect or consequential loss, lost profits or lost data. Our total liability to you for any claim relating to the platform is limited to the fees you paid us in the six months before the claim arose. Nothing in these terms limits liability that cannot be limited by law, or your statutory rights as a consumer.`,
      ],
    },
    {
      id: "indemnity",
      heading: "10. Indemnity",
      body: [
        `You agree to compensate ${C} for any claim, penalty or cost (including reasonable legal fees) arising from your listings, your transactions with other users, or your breach of these terms or of the law.`,
      ],
    },
    {
      id: "suspension",
      heading: "11. Suspension and termination",
      body: [
        "We may warn you, limit your account, remove content, or suspend or close your account if you break these terms, if we suspect fraud, or if we are required to by law. Where it is safe and lawful, we will tell you why. You may close your account at any time from your dashboard or by contacting support. Sections that by their nature should survive (fees owed, licences already granted, disclaimers, liability and governing law) continue after your account is closed.",
      ],
    },
    {
      id: "changes",
      heading: "12. Changes to these terms",
      body: [
        "We may update these terms as the service and the law change. We will post the new version with a new \"last updated\" date and, for significant changes, notify you by SMS, email or a notice on the site. If you keep using the platform after a change takes effect, you accept the updated terms.",
      ],
    },
    {
      id: "law",
      heading: "13. Governing law and disputes",
      body: [
        "These terms are governed by the laws of the United Republic of Tanzania. If a dispute arises, contact us first and we will try in good faith to resolve it within 30 days. If it is not resolved, either party may refer it to mediation, and failing that to the competent courts of Tanzania. Disputes between buyers and sellers are for them to resolve. We may share relevant records where the law requires it or where you ask us to.",
      ],
    },
    {
      id: "contact",
      heading: "14. Contact",
      body: [
        `${C}, operator of ${B}. Email: ${SITE.supportEmail}. Phone / WhatsApp: ${SITE.supportPhone}.`,
      ],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  summary: `How ${C} collects, uses, shares and protects personal data on ${B}, and the rights you have under the Personal Data Protection Act, 2022.`,
  sections: [
    {
      id: "controller",
      heading: "1. Who is responsible for your data",
      body: [
        `${C} operates ${B} and is the data controller for personal data processed through the platform. For any privacy question or request, contact us at ${SITE.privacyEmail}.`,
        "We process personal data in line with the Personal Data Protection Act, 2022 of Tanzania (PDPA) and its regulations. You can raise a complaint with the Personal Data Protection Commission (PDPC) if you think we have not handled your data properly.",
      ],
    },
    {
      id: "collect",
      heading: "2. What we collect",
      body: [
        { list: [
          "Account data: name, mobile number, email address, password (stored only as a secure hash), language preference, region and district.",
          "Business data: business name, type, address, phone and WhatsApp numbers, TIN, BRELA registration number and other verification documents you provide.",
          "Listing data: vehicle and part details, photos, price, location, contact numbers and, if you provide it, the chassis number. The chassis number is never shown publicly.",
          "Communications: inquiries, offers, test-drive and inspection requests, messages between buyers and sellers, and reports you send us.",
          "Payment data: amount, purpose, mobile-money number used and transaction references from the payment provider. We never receive or store your mobile-money PIN or full card number.",
          "Technical and usage data: the pages you view, listings you save, taps on WhatsApp or call buttons, device and browser type, and a one-way hashed version of your IP address for fraud prevention and rate limiting.",
          "Fraud-prevention data: a random device identifier stored in a cookie, the devices and phone numbers linked to your account, fingerprints of the photos you upload, and the risk signals our checks record about listings and messages.",
        ] },
      ],
    },
    {
      id: "use",
      heading: "3. Why we use it (purposes and lawful basis)",
      body: [
        { list: [
          "To create and run your account, publish your listings and connect you with buyers or sellers (to perform our contract with you).",
          "To send login codes, inquiry alerts, moderation results and payment confirmations by SMS or email (contract).",
          "To process payments, subscriptions and promotions (contract and legal obligations, including tax records).",
          "To verify businesses, detect fraud and scams, enforce our Terms of Use and Safety Policy, and keep the platform secure (our legitimate interests and legal obligations).",
          "To run automated fraud checks on accounts, listings and messages (for example comparing prices with the market, detecting reused photos and banned numbers). A check can hold a listing or message for review, but a person on our team makes the final decision on removing listings or banning accounts, and you can ask us to review it (our legitimate interests and the safety of other users).",
          "To show sellers anonymous statistics such as views and leads, and to improve search and the service (legitimate interests).",
          "To send marketing messages about MagariSOKO Tanzania, but only where you have consented. You can opt out at any time.",
        ] },
      ],
    },
    {
      id: "share",
      heading: "4. Who we share it with",
      body: [
        { list: [
          "Other users: what you put in a listing (photos, description, price, location and the contact number you choose) is public. When you send an inquiry, your name, phone number, email (if given) and message go to that seller.",
          "Service providers acting for us under contract: hosting and database providers, Cloudinary (image storage), SMS providers (such as Beem Africa and Africa's Talking) and payment providers (AzamPay, Selcom, DPO Pay).",
          "Authorities: TRA, the Police Force, courts or other public bodies where the law requires it, or where it is needed to investigate fraud or protect someone's safety.",
          `A buyer of all or part of ${C}'s business, under the same protections as this policy.`,
        ] },
        "We do not sell your personal data.",
      ],
    },
    {
      id: "transfers",
      heading: "5. Transfers outside Tanzania",
      body: [
        "Some of our service providers store or process data outside Tanzania, for example cloud hosting and image delivery. Where that happens, we make sure the transfer is allowed under the PDPA and protected by contract terms and security measures that give a level of protection comparable to Tanzanian law.",
      ],
    },
    {
      id: "retention",
      heading: "6. How long we keep it",
      body: [
        { list: [
          "Account data: for as long as your account is open, then up to 24 months for fraud prevention and dispute handling.",
          "Listings and inquiries: up to 24 months after the listing ends or the account is closed.",
          "Payment and tax records: as long as Tanzanian tax and accounting laws require (generally at least 5 years).",
          "SMS login codes: deleted within 24 hours of expiry. Hashed IP data and analytics events: up to 12 months.",
        ] },
        "After these periods, we delete the data or anonymise it so it no longer identifies you.",
      ],
    },
    {
      id: "rights",
      heading: "7. Your rights",
      body: [
        "Under the PDPA you have the right to:",
        { list: [
          "be told how your data is processed (this policy);",
          "access the personal data we hold about you and get a copy;",
          "have inaccurate or incomplete data corrected;",
          "have data deleted or its processing restricted where it is no longer needed or was processed unlawfully;",
          "object to processing based on our legitimate interests, and to marketing at any time;",
          "withdraw consent where processing is based on consent, without affecting earlier processing;",
          "complain to the Personal Data Protection Commission.",
        ] },
        `Send requests to ${SITE.privacyEmail} from the email or phone number on your account. We will reply within 30 days. You can edit most of your data, and delete your listings, yourself from your dashboard.`,
      ],
    },
    {
      id: "security",
      heading: "8. Security",
      body: [
        "We use HTTPS encryption, hashed passwords, one-time SMS codes, access controls for staff, rate limiting and monitoring to protect your data. No online service is completely secure. Protect your account by never sharing your password or SMS code. MagariSOKO Tanzania staff will never ask you for them.",
      ],
    },
    {
      id: "cookies",
      heading: "9. Cookies",
      body: [
        "We use only essential cookies: a session cookie that keeps you signed in, a security (CSRF) cookie, a device cookie (gs_did) that helps us detect fraud and banned devices, and a cookie that remembers your language. We do not use advertising or cross-site tracking cookies. If we add analytics cookies in future, we will update this policy and ask for your consent where the law requires it.",
      ],
    },
    {
      id: "children",
      heading: "10. Children",
      body: [
        `${N} is for adults. We do not knowingly collect data from anyone under 18. If you believe a child has given us personal data, contact us and we will delete it.`,
      ],
    },
    {
      id: "changes",
      heading: "11. Changes to this policy",
      body: [
        "We will post any update here with a new \"last updated\" date. If the changes are significant, we will notify you by SMS, email or a notice on the site before they take effect.",
      ],
    },
  ],
};

const safetyEn: LegalDoc = {
  title: "Safety Policy",
  summary: `How to buy and sell safely on ${B}, what we do to keep scammers out, and how to report a problem.`,
  sections: [
    {
      id: "buyers",
      heading: "1. Safety rules for buyers",
      body: [
        { list: [
          "Never pay a deposit, \"booking fee\", \"clearing fee\" or \"transport fee\" before you have seen the vehicle and met the seller in person.",
          "Meet in a busy public place during the day, or at a verified dealer's showroom. Take someone with you.",
          "Check the registration card (kadi ya gari) and confirm the owner's details and chassis and engine numbers with TRA before you pay. The chassis number on the card must match the one on the vehicle.",
          "Ask for a test drive and book a pre-purchase inspection with an independent, certified mechanic or inspection centre.",
          "Pay by bank transfer or traceable mobile money, only to the registered owner or the dealer's business account. Never pay a \"broker\" or any third party you have not met.",
          "Get a signed sale agreement and complete the TRA transfer of ownership before you take the vehicle.",
          "If a price looks far too low, or the seller is \"abroad\" or \"at the port\" and can only take payment upfront, treat it as a scam.",
        ] },
      ],
    },
    {
      id: "imports",
      heading: "2. Import-on-order purchases",
      body: [
        { list: [
          "Deal only with verified importers, and get a written quotation showing FOB, freight, insurance, the estimated duties and the delivery date.",
          "Ask for the auction sheet or export certificate and the vehicle's chassis number before paying, and check them independently.",
          "Make sure the vehicle meets Tanzania's import rules, including any age limits, pre-shipment inspection and roadworthiness requirements, before you commit.",
          "The duties and levies shown on MagariSOKO Tanzania are estimates. TRA sets the final figure at clearance.",
        ] },
      ],
    },
    {
      id: "sellers",
      heading: "3. Safety rules for sellers",
      body: [
        { list: [
          "Never hand over the vehicle, keys or registration card until the full payment has cleared in your own account. Fake bank slips and fake M-Pesa SMS messages are common: always check your actual balance.",
          "Don't send \"refunds\" for overpayments. Overpayment is a known scam.",
          "Go with the buyer on test drives, check their ID first, and keep your copy of the car's documents safe.",
          "Meet buyers in public places, and avoid sharing your home address until you need to.",
        ] },
      ],
    },
    {
      id: "parts-services",
      heading: "4. Spare parts and services",
      body: [
        { list: [
          "Confirm fitment with your chassis number and the part number before paying. Inspect parts before you hand over payment where possible.",
          "Ask about warranty and returns in writing.",
          "For repairs, agree the price and scope first, keep receipts, and use verified providers where you can.",
        ] },
      ],
    },
    {
      id: "our-measures",
      heading: "5. What MagariSOKO Tanzania does",
      body: [
        { list: [
          "We verify phone numbers by SMS code, and review new listings before they go live (except those from verified businesses).",
          "Every listing and message is screened automatically: prices far below the market, photos reused from other listings, scam wording, shared or banned phone numbers and devices, and duplicate chassis numbers raise a risk score, and risky listings are held until our team checks them.",
          "Verified businesses have had their TIN and BRELA documents checked by our team.",
          "Contact numbers are hidden behind a \"Show number\" button to reduce scraping, and inquiries are rate-limited to stop spam.",
          "We investigate every report, remove fraudulent listings and ban repeat offenders. Where needed, we share information with the Police Force.",
        ] },
        `${N} staff will never ask you for your password, SMS code, mobile-money PIN, or payment to unlock a listing outside the official checkout on this website.`,
      ],
    },
    {
      id: "report",
      heading: "6. Report a problem",
      body: [
        `Use the "Report this listing" link on any listing, or contact ${SITE.safetyEmail} or ${SITE.supportPhone}. If you have lost money, report it to the nearest police station immediately, and to your mobile-money provider or bank so they can try to stop the transaction.`,
      ],
    },
    {
      id: "disclaimer",
      heading: "7. Important",
      body: [
        `Following this policy reduces risk, but it cannot remove it. ${N} is a marketplace and is not a party to transactions between users. See our Terms of Use.`,
      ],
    },
  ],
};

/* ═════════════════════════════════ KISWAHILI ═══════════════════════════════ */

const termsSw: LegalDoc = {
  title: "Masharti ya Matumizi",
  summary: `Masharti haya yanasimamia matumizi yako ya ${B}, soko la mtandaoni linaloendeshwa na ${C} linalowaunganisha wanunuzi na wauzaji wa magari, vipuri na watoa huduma za magari kote Tanzania.`,
  sections: [
    {
      id: "acceptance",
      heading: "1. Sisi ni nani na kukubali masharti haya",
      body: [
        `${B} ("sisi") ni bidhaa ya ${C}. Kwa kufungua akaunti, kuingia, kuweka tangazo, kutuma ujumbe kwa muuzaji au kutumia tovuti kwa namna nyingine yoyote, unakubali Masharti haya ya Matumizi, Sera yetu ya Faragha na Sera yetu ya Usalama. Kama hukubaliani nayo, usitumie ${N}.`,
        "Kama unatumia jukwaa kwa niaba ya biashara (muuzaji wa magari, mwagizaji, duka la vipuri, gereji au mtoa huduma mwingine), unathibitisha kuwa una mamlaka ya kukubali masharti haya kwa niaba yake, na biashara hiyo inafungwa nayo.",
      ],
    },
    {
      id: "role",
      heading: `2. ${N} ni soko, si muuzaji`,
      body: [
        `${N} ni jukwaa ambapo wauzaji wanatangaza na wanunuzi wanawapata na kuwasiliana nao. Sisi si sehemu ya mauzo, manunuzi, mikataba ya huduma, mikopo au oda za uagizaji kati ya watumiaji. Hatumiliki, hatukagui, hatuhifadhi, hatuagizi, hatusafirishi wala hatutoi dhamana kwa magari, vipuri au huduma zinazotangazwa.`,
        "Mkataba wa gari, kipuri au huduma ni kati ya mnunuzi na muuzaji au mtoa huduma pekee. Wao ndio wanaowajibika kwa bei, hali ya bidhaa, malipo, uhamisho wa umiliki, usajili kwa Mamlaka ya Mapato Tanzania (TRA), usafirishaji, dhamana na huduma baada ya mauzo.",
      ],
    },
    {
      id: "eligibility",
      heading: "3. Vigezo na akaunti",
      body: [
        { list: [
          "Lazima uwe na umri wa miaka 18 au zaidi na uwe na uwezo wa kuingia mkataba chini ya sheria za Tanzania.",
          "Lazima utoe taarifa sahihi na uhakikishe namba ya simu, barua pepe na taarifa za biashara yako ziko sahihi wakati wote.",
          "Unawajibika kwa kila kinachofanyika kupitia akaunti yako. Usimpe mtu nenosiri lako wala namba za SMS, na tujulishe mara moja ukihisi mtu mwingine anatumia akaunti yako.",
          "Mtu mmoja anaweza kuwa na akaunti moja binafsi. Biashara zinaweza kuongeza wafanyakazi kama wanachama wa wasifu wa biashara.",
          "Tunaweza kuhakiki utambulisho, namba za simu na nyaraka za biashara (kama TIN au usajili wa BRELA). Alama ya \"Imethibitishwa\" inamaanisha tu kwamba tulikagua nyaraka hizo. Si dhamana ya muamala wowote.",
        ] },
      ],
    },
    {
      id: "listings",
      heading: "4. Kanuni za matangazo",
      body: [
        "Unapoweka tangazo, unathibitisha kwamba:",
        { list: [
          "unamiliki gari au kipuri, au umeidhinishwa na mmiliki kukiuza, na hakina mkopo, rehani, amri ya mahakama au madai mengine ambayo hujayaweka wazi;",
          "gari au kipuri si cha wizi, magendo, bandia, wala si kinyume cha sheria kukiuza Tanzania;",
          "picha zinaonyesha bidhaa halisi, na maelezo, mwaka, kilomita, hali, bei na mahali ni ya kweli na kamili;",
          "kwa matangazo ya kuagiza, bei ya FOB, usafirishaji, nchi inakotoka na makadirio ya muda wa kufika ni ya kweli, na utamjulisha mnunuzi waziwazi mabadiliko yoyote kabla hajalipa;",
          "utasasisha au kuondoa tangazo mara bidhaa itakapouzwa au kutopatikana tena.",
        ] },
        "Tunakagua matangazo na tunaweza kurekebisha mpangilio wake, au kukataa, kusimamisha au kuondoa tangazo lolote linalokiuka masharti haya au tunaloamini kwa sababu za msingi linaweza kupotosha au kudhuru watumiaji. Matangazo yanaisha muda baada ya kipindi kilichoonyeshwa kwenye ukurasa wa bei, isipokuwa ukiyahuisha.",
      ],
    },
    {
      id: "prohibited",
      heading: "5. Mambo yaliyokatazwa",
      body: [
        "Hauruhusiwi:",
        { list: [
          "kuweka matangazo ya uongo, yanayojirudia, ya kumvuta mnunuzi kwa bidhaa nyingine, au yanayopotosha, wala bei usiyokusudia kuiheshimu;",
          "kumwomba mnunuzi amana, \"ada ya kushikilia\" au malipo ya awali kabla hajakagua bidhaa, au kumwambia amlipe mtu wa tatu;",
          "kujifanya mtu mwingine, muuzaji, benki, ofisi ya serikali au mfanyakazi wa MagariSOKO Tanzania;",
          "kukusanya namba za simu au taarifa za watumiaji wengine, kutuma ujumbe taka, au kuwasiliana na watumiaji kwa jambo lisilohusiana na tangazo lao;",
          "kutumia roboti, programu za kunakili au zana za kiotomatiki kunakili maudhui au kulemea huduma;",
          "kupakia maudhui yaliyo kinyume cha sheria, ya kashfa, ya chuki, ya ngono, au yanayokiuka hakimiliki au faragha ya mtu mwingine;",
          "kujaribu kukwepa ada zetu, mifumo ya usalama au ukaguzi, au kutenda kosa lolote chini ya Sheria ya Makosa ya Mtandao, 2015.",
        ] },
      ],
    },
    {
      id: "fees",
      heading: "6. Ada na malipo",
      body: [
        `Kutazama matangazo na kuwasiliana na wauzaji ni bure. Kila muuzaji binafsi, dila, yadi ya magari, mwagizaji, duka la vipuri na mtoa huduma analipa ada ya usajili ya mara moja ya TSh ${SITE.registrationFeeTzs.toLocaleString("en-US")} kabla ya kuweka matangazo. Timu yetu inathibitisha malipo kabla ya kuidhinisha usajili; usajili unakamilika na mini-tovuti ya muuzaji inaundwa baada ya kuidhinishwa tu. Hakuna ada kwa kila tangazo. Ada za hiari zinatozwa kwa matangazo ya kukuza (Maalum, Udhamini, Panda juu, Ukurasa wa mbele), mipango ya mwezi ya biashara na matangazo ya biashara. Bei zinaonyeshwa kwa Shilingi za Tanzania (TZS) kwenye ukurasa wa bei, zinajumuisha kodi husika isipokuwa ikielezwa vinginevyo, na zinathibitishwa kabla hujalipa.`,
        "Kila gari, kipuri na huduma lazima vionyeshe bei kwa TZS. Kila tangazo la gari lazima pia lionyeshe mwaka wa kutengenezwa, aina (make), modeli, kilomita, aina ya mafuta, giaboksi na kama ni jipya, used kutoka nje au limetumika nchini. Tangazo lisilo na taarifa hizi halichapishwi.",
        "Malipo yanachakatwa na watoa huduma za malipo wenye leseni (kama AzamPay, Selcom na DPO Pay) kupitia pesa ya simu (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, AzamPesa) au kadi. Hatuhifadhi PIN yako ya pesa ya simu wala taarifa za kadi yako.",
        { list: [
          "Tangazo la kukuza linaanza mara malipo yanapothibitishwa na linaendelea kwa kipindi ulicholipia. Ada hazirudishwi baada ya kipindi cha tangazo au usajili kuanza, isipokuwa pale sheria inapotaka hivyo au huduma haikutolewa kwa kosa letu.",
          "Tangazo likiondolewa kwa kukiuka masharti haya, ada zilizolipwa kwa ajili yake hazirudishwi.",
          "Ada ya usajili hairudishwi baada ya usajili kuidhinishwa. Tusipoweza kuthibitisha malipo, tunayakataa na kukueleza sababu ili urekebishe; malipo ambayo hayakutufikia hayatozwi mara mbili.",
          "Mpango wa mwezi unahuishwa tu unapolipa tena. Mpango usiolipiwa unaisha mwisho wa kipindi chake, na matangazo yako yanarudi kwenye kikomo kilichojumuishwa kwenye usajili wako.",
        ] },
        "MagariSOKO Tanzania haishikilii wala kuhamisha fedha za manunuzi ya magari au vipuri kati ya wanunuzi na wauzaji.",
      ],
    },
    {
      id: "content",
      heading: "7. Maudhui yako na hakimiliki yetu",
      body: [
        `Picha na maandishi unayopakia yanabaki kuwa mali yako. Unampa ${C} leseni isiyo ya kipekee, bila malipo na ya dunia nzima ya kuhifadhi, kuonyesha, kubadilisha ukubwa, kuweka alama na kutangaza maudhui hayo kwenye ${N} na katika matangazo yetu (pamoja na mitandao ya kijamii na injini za utafutaji) kwa muda wote yatakapokuwa kwenye jukwaa, na kwa muda unaofaa baadaye katika nakala za akiba.`,
        `Jina la ${N}, nembo, muundo, programu, hifadhidata na mkusanyiko wa matangazo ni mali ya ${C} na yanalindwa na sheria ya hakimiliki na sheria nyingine. Huruhusiwi kuyanakili, kuyavuna, kuyauza upya wala kutengeneza kazi nyingine kutokana nayo bila ruhusa yetu ya maandishi.`,
      ],
    },
    {
      id: "estimates",
      heading: "8. Makadirio, vikokotoo na taarifa za watu wengine",
      body: [
        "Makadirio ya gharama za kuagiza (ushuru wa forodha, ushuru wa bidhaa, VAT na tozo), viwango vya kubadilisha fedha na mikopo ni kwa mwongozo tu. Kiasi halisi hupangwa na TRA wakati wa kutoa gari bandarini, na benki au mkopeshaji wako, na soko la siku hiyo. Thibitisha kila mara na TRA, wakala wa forodha mwenye leseni au mkopeshaji wako kabla ya kufanya uamuzi.",
        "Maoni, alama za ubora, taarifa za biashara na viungo vya tovuti nyingine vinatolewa na watumiaji au watu wengine. Hatuvithibitishi na hatuwajibiki kwa usahihi wake.",
      ],
    },
    {
      id: "liability",
      heading: "9. Kanusho na ukomo wa dhima",
      body: [
        `${N} inatolewa \"kama ilivyo\" na \"kadiri inavyopatikana\". Kwa kiwango kikubwa kinachoruhusiwa na sheria za Tanzania, hatutoi dhamana kwamba matangazo ni sahihi, kwamba watumiaji ni wale wanaodai kuwa, wala kwamba huduma haitakatika au haitakuwa na makosa.`,
        `Kwa kiwango kinachoruhusiwa na sheria, ${C} haiwajibiki kwa hasara yoyote inayotokana na miamala kati ya watumiaji, udanganyifu wa mtumiaji mwingine, au hasara isiyo ya moja kwa moja, faida iliyopotea au data iliyopotea. Dhima yetu yote kwako kwa dai lolote linalohusu jukwaa ni ada ulizotulipa katika miezi sita kabla ya dai kutokea. Hakuna kitu katika masharti haya kinachoondoa dhima ambayo sheria hairuhusu kuiondoa, wala haki zako za kisheria kama mlaji.`,
      ],
    },
    {
      id: "indemnity",
      heading: "10. Fidia",
      body: [
        `Unakubali kumfidia ${C} kwa dai lolote, adhabu au gharama (pamoja na ada za kisheria zinazostahili) zitakazotokana na matangazo yako, miamala yako na watumiaji wengine, au ukiukaji wako wa masharti haya au wa sheria.`,
      ],
    },
    {
      id: "suspension",
      heading: "11. Kusimamishwa na kufungwa kwa akaunti",
      body: [
        "Tunaweza kukuonya, kuweka mipaka kwenye akaunti yako, kuondoa maudhui, au kusimamisha au kufunga akaunti yako ukikiuka masharti haya, tukishuku udanganyifu, au sheria ikitutaka kufanya hivyo. Pale itakapokuwa salama na halali, tutakueleza sababu. Unaweza kufunga akaunti yako wakati wowote kupitia dashibodi yako au kwa kuwasiliana na huduma kwa wateja. Vifungu ambavyo kwa asili yake vinapaswa kuendelea (ada unazodaiwa, leseni zilizokwisha tolewa, kanusho, dhima na sheria inayotumika) vinaendelea kutumika baada ya akaunti kufungwa.",
      ],
    },
    {
      id: "changes",
      heading: "12. Mabadiliko ya masharti",
      body: [
        "Tunaweza kusasisha masharti haya kadiri huduma na sheria zinavyobadilika. Tutaweka toleo jipya pamoja na tarehe mpya ya \"ilisasishwa mwisho\" na, kwa mabadiliko makubwa, tutakujulisha kwa SMS, barua pepe au tangazo kwenye tovuti. Ukiendelea kutumia jukwaa baada ya mabadiliko kuanza kutumika, unakubali masharti mapya.",
      ],
    },
    {
      id: "law",
      heading: "13. Sheria inayotumika na migogoro",
      body: [
        "Masharti haya yanasimamiwa na sheria za Jamhuri ya Muungano wa Tanzania. Mgogoro ukitokea, wasiliana nasi kwanza na tutajitahidi kwa nia njema kuutatua ndani ya siku 30. Usipotatuliwa, upande wowote unaweza kuupeleka kwenye usuluhishi, na ikishindikana, kwenye mahakama zenye mamlaka Tanzania. Migogoro kati ya wanunuzi na wauzaji ni yao kuitatua. Tunaweza kutoa kumbukumbu zinazohusika pale sheria inapotaka au ukituomba.",
      ],
    },
    {
      id: "contact",
      heading: "14. Mawasiliano",
      body: [
        `${C}, mwendeshaji wa ${B}. Barua pepe: ${SITE.supportEmail}. Simu / WhatsApp: ${SITE.supportPhone}.`,
      ],
    },
  ],
};

const privacySw: LegalDoc = {
  title: "Sera ya Faragha",
  summary: `Jinsi ${C} inavyokusanya, kutumia, kushirikisha na kulinda taarifa binafsi kwenye ${B}, na haki zako chini ya Sheria ya Ulinzi wa Taarifa Binafsi, 2022.`,
  sections: [
    {
      id: "controller",
      heading: "1. Anayewajibika kwa taarifa zako",
      body: [
        `${C} inaendesha ${B} na ndiye mdhibiti wa taarifa binafsi zinazochakatwa kupitia jukwaa hili. Kwa swali au ombi lolote kuhusu faragha, wasiliana nasi kupitia ${SITE.privacyEmail}.`,
        "Tunachakata taarifa binafsi kwa mujibu wa Sheria ya Ulinzi wa Taarifa Binafsi, 2022 ya Tanzania na kanuni zake. Unaweza kuwasilisha malalamiko kwa Tume ya Ulinzi wa Taarifa Binafsi (PDPC) ukiona hatujashughulikia taarifa zako ipasavyo.",
      ],
    },
    {
      id: "collect",
      heading: "2. Taarifa tunazokusanya",
      body: [
        { list: [
          "Taarifa za akaunti: jina, namba ya simu, barua pepe, nenosiri (linahifadhiwa tu likiwa limesimbwa kwa usalama), lugha unayopendelea, mkoa na wilaya.",
          "Taarifa za biashara: jina la biashara, aina, anwani, namba za simu na WhatsApp, TIN, namba ya usajili wa BRELA na nyaraka nyingine za uthibitisho unazotoa.",
          "Taarifa za matangazo: maelezo ya gari na kipuri, picha, bei, mahali, namba za mawasiliano na, ukiitoa, namba ya chasisi. Namba ya chasisi haionyeshwi hadharani.",
          "Mawasiliano: maswali, ofa, maombi ya kujaribu gari na ukaguzi, ujumbe kati ya wanunuzi na wauzaji, na ripoti unazotutumia.",
          "Taarifa za malipo: kiasi, madhumuni, namba ya pesa ya simu iliyotumika na kumbukumbu za muamala kutoka kwa mtoa huduma za malipo. Hatupokei wala kuhifadhi PIN yako ya pesa ya simu au namba kamili ya kadi.",
          "Taarifa za kiufundi na matumizi: kurasa unazotazama, matangazo unayohifadhi, unapobonyeza vitufe vya WhatsApp au simu, aina ya kifaa na kivinjari, na anwani yako ya IP iliyosimbwa kwa njia isiyorejesheka kwa ajili ya kuzuia udanganyifu na kudhibiti maombi mengi.",
          "Taarifa za kuzuia udanganyifu: kitambulisho cha kifaa kinachohifadhiwa kwenye kidakuzi, vifaa na namba za simu zinazohusishwa na akaunti yako, alama za utambulisho wa picha unazopakia, na viashiria vya hatari ambavyo ukaguzi wetu unarekodi kuhusu matangazo na ujumbe.",
        ] },
      ],
    },
    {
      id: "use",
      heading: "3. Kwa nini tunazitumia (madhumuni na msingi wa kisheria)",
      body: [
        { list: [
          "Kufungua na kuendesha akaunti yako, kuchapisha matangazo yako na kukuunganisha na wanunuzi au wauzaji (kutekeleza mkataba wetu nawe).",
          "Kutuma namba za kuingia, taarifa za maswali mapya, matokeo ya ukaguzi wa matangazo na uthibitisho wa malipo kwa SMS au barua pepe (mkataba).",
          "Kuchakata malipo, usajili na matangazo ya kukuza (mkataba na wajibu wa kisheria, pamoja na kumbukumbu za kodi).",
          "Kuthibitisha biashara, kugundua udanganyifu na utapeli, kusimamia Masharti ya Matumizi na Sera ya Usalama, na kulinda usalama wa jukwaa (maslahi yetu halali na wajibu wa kisheria).",
          "Kufanya ukaguzi wa kiotomatiki wa udanganyifu kwenye akaunti, matangazo na ujumbe (kwa mfano kulinganisha bei na soko, kugundua picha zilizotumika tena na namba zilizopigwa marufuku). Ukaguzi unaweza kusimamisha tangazo au ujumbe ili ukaguliwe, lakini mtu wa timu yetu ndiye anayefanya uamuzi wa mwisho wa kuondoa tangazo au kufungia akaunti, na unaweza kutuomba tuupitie upya (maslahi yetu halali na usalama wa watumiaji wengine).",
          "Kuwaonyesha wauzaji takwimu zisizomtambulisha mtu kama idadi ya waliotazama na wateja, na kuboresha utafutaji na huduma (maslahi halali).",
          "Kutuma ujumbe wa matangazo kuhusu MagariSOKO Tanzania, lakini tu pale ulipokubali. Unaweza kujiondoa wakati wowote.",
        ] },
      ],
    },
    {
      id: "share",
      heading: "4. Tunaowashirikisha",
      body: [
        { list: [
          "Watumiaji wengine: unachoweka kwenye tangazo (picha, maelezo, bei, mahali na namba ya simu unayochagua) kinaonekana hadharani. Unapotuma swali, jina lako, namba ya simu, barua pepe (ukiitoa) na ujumbe vinatumwa kwa muuzaji husika.",
          "Watoa huduma wanaotufanyia kazi chini ya mkataba: watoa huduma za seva na hifadhidata, Cloudinary (kuhifadhi picha), watoa huduma za SMS (kama Beem Africa na Africa's Talking) na watoa huduma za malipo (AzamPay, Selcom, DPO Pay).",
          "Mamlaka: TRA, Jeshi la Polisi, mahakama au taasisi nyingine za umma pale sheria inapotaka, au inapohitajika kuchunguza udanganyifu au kulinda usalama wa mtu.",
          `Mnunuzi wa biashara yote au sehemu ya biashara ya ${C}, chini ya ulinzi uleule wa sera hii.`,
        ] },
        "Hatuuzi taarifa zako binafsi.",
      ],
    },
    {
      id: "transfers",
      heading: "5. Kuhamisha taarifa nje ya Tanzania",
      body: [
        "Baadhi ya watoa huduma wetu huhifadhi au kuchakata taarifa nje ya Tanzania, kwa mfano huduma za seva za wingu na usambazaji wa picha. Hilo likitokea, tunahakikisha uhamisho unaruhusiwa chini ya Sheria ya Ulinzi wa Taarifa Binafsi na unalindwa na masharti ya mkataba na hatua za usalama zinazotoa kiwango cha ulinzi kinacholingana na sheria za Tanzania.",
      ],
    },
    {
      id: "retention",
      heading: "6. Tunazihifadhi kwa muda gani",
      body: [
        { list: [
          "Taarifa za akaunti: kwa muda wote akaunti yako ikiwa wazi, kisha hadi miezi 24 kwa ajili ya kuzuia udanganyifu na kushughulikia migogoro.",
          "Matangazo na maswali: hadi miezi 24 baada ya tangazo kuisha au akaunti kufungwa.",
          "Kumbukumbu za malipo na kodi: kwa muda unaotakiwa na sheria za kodi na uhasibu za Tanzania (kwa kawaida angalau miaka 5).",
          "Namba za SMS za kuingia: zinafutwa ndani ya saa 24 baada ya kuisha muda. IP iliyosimbwa na takwimu za matumizi: hadi miezi 12.",
        ] },
        "Baada ya vipindi hivi, tunafuta taarifa au kuziondolea utambulisho ili zisikutambulishe tena.",
      ],
    },
    {
      id: "rights",
      heading: "7. Haki zako",
      body: [
        "Chini ya Sheria ya Ulinzi wa Taarifa Binafsi una haki ya:",
        { list: [
          "kuelezwa jinsi taarifa zako zinavyochakatwa (sera hii);",
          "kupata taarifa binafsi tunazoshikilia kukuhusu na kupewa nakala;",
          "kurekebishiwa taarifa zisizo sahihi au zisizokamilika;",
          "kufutiwa taarifa au kuzuia uchakataji wake pale zisipohitajika tena au zilipochakatwa kinyume cha sheria;",
          "kupinga uchakataji unaotegemea maslahi yetu halali, na kukataa matangazo wakati wowote;",
          "kuondoa ridhaa pale uchakataji unapotegemea ridhaa, bila kuathiri uchakataji uliofanyika awali;",
          "kuwasilisha malalamiko kwa Tume ya Ulinzi wa Taarifa Binafsi.",
        ] },
        `Tuma maombi kwa ${SITE.privacyEmail} ukitumia barua pepe au namba ya simu iliyo kwenye akaunti yako. Tutajibu ndani ya siku 30. Taarifa nyingi unaweza kuzihariri, na kufuta matangazo yako, mwenyewe kupitia dashibodi yako.`,
      ],
    },
    {
      id: "security",
      heading: "8. Usalama",
      body: [
        "Tunatumia usimbaji wa HTTPS, nenosiri lililosimbwa, namba za SMS za mara moja, udhibiti wa ufikiaji kwa wafanyakazi, udhibiti wa maombi mengi na ufuatiliaji ili kulinda taarifa zako. Hakuna huduma ya mtandaoni iliyo salama kabisa. Linda akaunti yako kwa kutompa mtu yeyote nenosiri au namba ya SMS. Wafanyakazi wa MagariSOKO Tanzania hawatakuomba kamwe.",
      ],
    },
    {
      id: "cookies",
      heading: "9. Vidakuzi (cookies)",
      body: [
        "Tunatumia vidakuzi muhimu tu: kidakuzi cha kipindi kinachokuweka ndani ya akaunti, kidakuzi cha usalama (CSRF), kidakuzi cha kifaa (gs_did) kinachotusaidia kugundua udanganyifu na vifaa vilivyopigwa marufuku, na kidakuzi kinachokumbuka lugha yako. Hatutumii vidakuzi vya matangazo wala vya kukufuatilia kwenye tovuti nyingine. Tukiongeza vidakuzi vya takwimu siku zijazo, tutasasisha sera hii na kukuomba ridhaa pale sheria inapotaka.",
      ],
    },
    {
      id: "children",
      heading: "10. Watoto",
      body: [
        `${N} ni kwa watu wazima. Hatukusanyi kwa makusudi taarifa za mtu yeyote mwenye umri chini ya miaka 18. Ukiamini mtoto ametupa taarifa binafsi, wasiliana nasi na tutazifuta.`,
      ],
    },
    {
      id: "changes",
      heading: "11. Mabadiliko ya sera hii",
      body: [
        "Tutaweka masasisho yoyote hapa pamoja na tarehe mpya ya \"ilisasishwa mwisho\". Mabadiliko yakiwa makubwa, tutakujulisha kwa SMS, barua pepe au tangazo kwenye tovuti kabla hayajaanza kutumika.",
      ],
    },
  ],
};

const safetySw: LegalDoc = {
  title: "Sera ya Usalama",
  summary: `Jinsi ya kununua na kuuza kwa usalama kwenye ${B}, tunachofanya kuwazuia matapeli, na jinsi ya kuripoti tatizo.`,
  sections: [
    {
      id: "buyers",
      heading: "1. Kanuni za usalama kwa wanunuzi",
      body: [
        { list: [
          "Usilipe kamwe amana, \"ada ya kushikilia\", \"ada ya kutoa bandarini\" au \"ada ya usafiri\" kabla ya kuona gari na kukutana na muuzaji ana kwa ana.",
          "Kutana mahali pa wazi penye watu wakati wa mchana, au kwenye ofisi ya muuzaji aliyethibitishwa. Nenda na mtu mwingine.",
          "Kagua kadi ya gari na thibitisha taarifa za mmiliki pamoja na namba za chasisi na injini kwa TRA kabla ya kulipa. Namba ya chasisi kwenye kadi lazima ilingane na iliyo kwenye gari.",
          "Omba kujaribu kuendesha gari, na mpeleke fundi au kituo cha ukaguzi huru kilichothibitishwa akague gari kabla ya kununua.",
          "Lipa kwa uhamisho wa benki au pesa ya simu inayofuatilika, tu kwa mmiliki aliyesajiliwa au akaunti ya biashara ya muuzaji. Usimlipe kamwe \"dalali\" au mtu wa tatu usiyemfahamu.",
          "Pata mkataba wa mauzo uliosainiwa, na kamilisha uhamisho wa umiliki TRA kabla ya kuchukua gari.",
          "Bei ikionekana ya chini mno, au muuzaji yuko \"nje ya nchi\" au gari liko \"bandarini\" na anataka malipo kwanza tu, chukulia kuwa ni utapeli.",
        ] },
      ],
    },
    {
      id: "imports",
      heading: "2. Manunuzi ya kuagiza",
      body: [
        { list: [
          "Fanya kazi na waagizaji waliothibitishwa pekee, na pata nukuu ya maandishi inayoonyesha FOB, usafirishaji, bima, makadirio ya ushuru na tarehe ya kufika.",
          "Omba karatasi ya mnada (auction sheet) au cheti cha usafirishaji na namba ya chasisi kabla ya kulipa, kisha vihakiki mwenyewe.",
          "Hakikisha gari linakidhi kanuni za uagizaji za Tanzania, pamoja na ukomo wa umri, ukaguzi kabla ya kusafirishwa na viwango vya ubora, kabla ya kujifunga.",
          "Ushuru na tozo zinazoonyeshwa kwenye MagariSOKO Tanzania ni makadirio. TRA ndiyo hupanga kiasi cha mwisho wakati wa kutoa gari bandarini.",
        ] },
      ],
    },
    {
      id: "sellers",
      heading: "3. Kanuni za usalama kwa wauzaji",
      body: [
        { list: [
          "Usikabidhi gari, funguo au kadi ya gari hadi malipo yote yaingie kwenye akaunti yako. Risiti za benki bandia na SMS bandia za M-Pesa ni za kawaida: kagua salio lako halisi kila mara.",
          "Usirudishe \"ziada\" ya malipo yaliyozidi. Malipo yaliyozidi ni mbinu inayojulikana ya utapeli.",
          "Ambatana na mnunuzi anapojaribu gari, kagua kitambulisho chake kwanza, na hifadhi nakala zako za nyaraka za gari salama.",
          "Kutana na wanunuzi mahali pa wazi, na epuka kutoa anwani ya nyumbani kwako hadi itakapohitajika.",
        ] },
      ],
    },
    {
      id: "parts-services",
      heading: "4. Vipuri na huduma",
      body: [
        { list: [
          "Thibitisha kama kipuri kinafaa kwa kutumia namba ya chasisi na namba ya kipuri kabla ya kulipa. Kagua vipuri kabla ya kulipa pale inapowezekana.",
          "Uliza kuhusu dhamana na urudishaji kwa maandishi.",
          "Kwa matengenezo, kubalianeni bei na kazi kwanza, hifadhi risiti, na tumia watoa huduma waliothibitishwa pale inapowezekana.",
        ] },
      ],
    },
    {
      id: "our-measures",
      heading: "5. MagariSOKO Tanzania inachofanya",
      body: [
        { list: [
          "Tunathibitisha namba za simu kwa namba ya SMS, na tunakagua matangazo mapya kabla hayajaonekana (isipokuwa ya biashara zilizothibitishwa).",
          "Kila tangazo na ujumbe hukaguliwa kiotomatiki: bei iliyo chini mno ya soko, picha zilizotumika kwenye matangazo mengine, maneno ya utapeli, namba za simu au vifaa vinavyoshirikishwa au vilivyopigwa marufuku, na namba za chasisi zinazojirudia huongeza alama ya hatari, na matangazo yenye hatari husimamishwa hadi timu yetu iyakague.",
          "Nyaraka za TIN na BRELA za biashara zilizothibitishwa zimekaguliwa na timu yetu.",
          "Namba za simu zimefichwa nyuma ya kitufe cha \"Onyesha namba\" ili kupunguza uvunaji wa namba, na maswali yanadhibitiwa ili kuzuia ujumbe taka.",
          "Tunachunguza kila ripoti, tunaondoa matangazo ya udanganyifu na tunawafungia wanaorudia. Pale inapohitajika, tunashirikiana na Jeshi la Polisi.",
        ] },
        `Wafanyakazi wa ${N} hawatakuomba kamwe nenosiri lako, namba ya SMS, PIN ya pesa ya simu, wala malipo ya kufungua tangazo nje ya mfumo rasmi wa malipo kwenye tovuti hii.`,
      ],
    },
    {
      id: "report",
      heading: "6. Ripoti tatizo",
      body: [
        `Tumia kiungo cha \"Ripoti tangazo hili\" kwenye tangazo lolote, au wasiliana nasi kupitia ${SITE.safetyEmail} au ${SITE.supportPhone}. Ukipoteza fedha, ripoti mara moja kwenye kituo cha polisi kilicho karibu, na kwa mtoa huduma wako wa pesa ya simu au benki ili wajaribu kuzuia muamala.`,
      ],
    },
    {
      id: "disclaimer",
      heading: "7. Muhimu",
      body: [
        `Kufuata sera hii kunapunguza hatari lakini hakuiondoi kabisa. ${N} ni soko na si sehemu ya miamala kati ya watumiaji. Tazama Masharti yetu ya Matumizi.`,
      ],
    },
  ],
};

export const LEGAL: Record<"en" | "sw", Record<LegalKey, LegalDoc>> = {
  en: { terms: termsEn, privacy: privacyEn, safety: safetyEn },
  sw: { terms: termsSw, privacy: privacySw, safety: safetySw },
};
