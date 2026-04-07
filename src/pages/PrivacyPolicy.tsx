import React from 'react';
import { Card } from '../components/ui/Card';

export function PrivacyPolicy() {
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen p-6 pt-32 pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10">
                    <p className="font-data text-xs text-brutal-red uppercase tracking-widest mb-2">Legal</p>
                    <h1 className="font-heading font-bold text-4xl md:text-5xl uppercase tracking-tight-heading text-brutal-dark mb-3">
                        Privacy Policy
                    </h1>
                    <p className="font-data text-xs text-brutal-dark/60 border-l-2 border-brutal-red pl-3">
                        Effective date: 7 April 2026 &nbsp;·&nbsp; Last updated: 7 April 2026
                    </p>
                </div>

                <Card className="p-8 md:p-12 space-y-8 font-data text-sm md:text-base text-brutal-dark/80 leading-relaxed">
                    <section>
                        <p>
                            This Privacy Policy explains how <strong>Param Foundation</strong> (a public charitable
                            trust registered in India, also operating under the brand <em>Param Innovation</em> and
                            running the <em>Param Makerspace</em> platform) collects, uses, stores, shares and
                            protects your personal data when you visit our website, register an account, attend our
                            programs at ParSEC Jayanagar / Channenahalli / Whitefield, or otherwise interact with
                            us. In this policy, "we", "us", "our" or "Param" refers to Param Foundation. "You"
                            refers to any user, member, visitor, parent, guardian, mentor or volunteer who interacts
                            with the Param Makerspace platform.
                        </p>
                        <p className="mt-3">
                            We are committed to handling your personal data in accordance with the
                            <strong> Digital Personal Data Protection Act, 2023 (DPDPA)</strong> of India and the
                            applicable Digital Personal Data Protection Rules, 2025, the
                            <strong> Information Technology Act, 2000</strong> (and the SPDI Rules, 2011), and other
                            applicable Indian laws. For the purposes of the DPDPA, Param Foundation acts as the
                            <strong> Data Fiduciary</strong>.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">1. Who we are</h2>
                        <p>
                            Param Foundation is a purpose-driven public trust headquartered in Bengaluru, Karnataka,
                            India. Our registered address is:
                        </p>
                        <p className="mt-2 pl-4 border-l-2 border-brutal-red/40">
                            Param Foundation, No. 4, 31st Cross, 16th Main, 4th Block, Jayanagar, Bengaluru,
                            Karnataka – 560011, India.
                        </p>
                        <p className="mt-3">
                            For any privacy-related queries or to exercise your rights, you can contact us at
                            <a href="mailto:info@paraminnovation.org" className="text-brutal-red font-bold"> info@paraminnovation.org</a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">2. Personal data we collect</h2>
                        <p>We only collect personal data that is necessary to operate the Param Makerspace platform and deliver our programs. This includes:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li><strong>Account data:</strong> name, email address, password (stored hashed), profile photo, role (viewer, maker, mentor, admin) and authentication identifiers from Google sign-in if you choose that option.</li>
                            <li><strong>Profile data:</strong> bio, skills, areas of interest, social or portfolio links you choose to share, and the projects, challenges, events and badges associated with your account.</li>
                            <li><strong>Activity data:</strong> submissions, project entries, comments, event registrations, badge progress and similar interactions on the platform.</li>
                            <li><strong>Device & technical data:</strong> IP address, browser type, device identifiers, log files and cookies/local storage used to keep you signed in and to maintain session security.</li>
                            <li><strong>Communications:</strong> emails, support requests and feedback you send us.</li>
                            <li><strong>Children's data:</strong> for participants under 18, we collect only the minimum data needed for participation, and only after verifiable parental or lawful guardian consent as required under Section 9 of the DPDPA.</li>
                        </ul>
                        <p className="mt-3">We do <strong>not</strong> knowingly collect Aadhaar numbers, financial account details, biometric data or any other sensitive identifiers through this platform.</p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">3. How we use your data</h2>
                        <p>We process your personal data only for clearly specified, lawful purposes, including:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li>Creating and managing your Param Makerspace account.</li>
                            <li>Allowing you to participate in projects, challenges, events, mentoring and the makers directory.</li>
                            <li>Issuing badges, certificates and rank-ups based on your activity.</li>
                            <li>Communicating service announcements, security alerts and updates about programs you have signed up for.</li>
                            <li>Maintaining the safety, security and integrity of our facilities and digital platform.</li>
                            <li>Complying with our legal obligations under Indian law, including record-keeping for charitable trust governance, 80G/12A/CSR-1/FCRA compliance and lawful requests from authorities.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">4. Legal basis &amp; consent</h2>
                        <p>
                            We rely on your <strong>free, specific, informed, unconditional and unambiguous consent</strong>
                            (Section 6, DPDPA) as the primary basis for processing personal data on this platform. By creating
                            an account or clicking "Sign Up", you consent to the processing described in this policy. Where
                            permitted, we may also process data for <em>certain legitimate uses</em> recognised under Section 7
                            of the DPDPA, such as responding to a medical emergency, ensuring safety during a disaster, or
                            complying with a court order.
                        </p>
                        <p className="mt-3">You may withdraw your consent at any time (see Section 8 below). Withdrawal will not affect the lawfulness of processing based on consent before its withdrawal.</p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">5. How we share your data</h2>
                        <p>We do not sell your personal data. We share it only in limited, specific situations:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li><strong>Service providers (Data Processors):</strong> hosting, database, authentication and email-delivery providers (for example Supabase and Google Cloud) who process data on our behalf under contractual confidentiality obligations.</li>
                            <li><strong>Within Param:</strong> authorised mentors and administrators who need access to perform their duties (for example reviewing a project submission or verifying a badge).</li>
                            <li><strong>Legal &amp; safety:</strong> when required by Indian law, by a court of competent jurisdiction, or to protect the rights, safety and property of Param, our community and the public.</li>
                            <li><strong>Public profile content:</strong> any information you choose to publish on your maker profile, project page or comment is visible to other Param Makerspace users and, where the page is public, to the general internet.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">6. Data retention</h2>
                        <p>
                            We retain your personal data only for as long as is necessary for the purposes set out in this
                            policy or as required by applicable law. If you delete your account, we will erase or anonymise
                            your personal data within a reasonable period, except where retention is required for legal,
                            audit, accounting or grievance-redressal purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">7. Security</h2>
                        <p>
                            We implement reasonable technical and organisational safeguards including encryption in transit
                            (HTTPS/TLS), hashed password storage, role-based access control, row-level security policies on
                            our database, and periodic access reviews. No method of transmission or storage is fully secure;
                            in the unlikely event of a personal data breach, we will notify the Data Protection Board of
                            India and affected users as required under the DPDPA and the DPDP Rules, 2025.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">8. Your rights as a Data Principal</h2>
                        <p>Under the DPDPA, you (as a Data Principal) have the right to:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li>Access a summary of the personal data we process about you and the processing activities.</li>
                            <li>Request correction, completion, updating or erasure of your personal data.</li>
                            <li>Withdraw your consent at any time, with the same ease with which you gave it.</li>
                            <li>Nominate another individual to exercise your rights in the event of death or incapacity.</li>
                            <li>Have your grievance redressed by us, and escalate to the Data Protection Board of India if not resolved.</li>
                        </ul>
                        <p className="mt-3">To exercise any of these rights, write to <a href="mailto:info@paraminnovation.org" className="text-brutal-red font-bold">info@paraminnovation.org</a> with the subject line "DPDPA Request".</p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">9. Cookies &amp; local storage</h2>
                        <p>
                            We use a small number of strictly necessary cookies and browser local-storage entries (for
                            example, your authentication session). We do not use third-party advertising cookies. You can
                            clear cookies in your browser settings; doing so may sign you out of the platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">10. Cross-border transfers</h2>
                        <p>
                            Some of our service providers may store data on servers located outside India. We will only
                            transfer personal data to countries that are not restricted by the Central Government under
                            Section 16 of the DPDPA, and we will ensure that comparable safeguards apply.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">11. Grievance Officer</h2>
                        <p>
                            In line with Rule 5(9) of the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules,
                            2021 and Section 8(10) of the DPDPA, you can reach our designated point of contact for
                            grievances:
                        </p>
                        <p className="mt-2 pl-4 border-l-2 border-brutal-red/40">
                            Grievance Officer, Param Foundation<br />
                            No. 4, 31st Cross, 16th Main, 4th Block, Jayanagar, Bengaluru – 560011, India<br />
                            Email: <a href="mailto:info@paraminnovation.org" className="text-brutal-red font-bold">info@paraminnovation.org</a>
                        </p>
                        <p className="mt-3">We will acknowledge your complaint within 48 hours and aim to resolve it within 30 days.</p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">12. Changes to this policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time to reflect changes in our services or in the
                            law. We will post the updated version on this page and update the "Last updated" date above.
                            Material changes will, where appropriate, be communicated by email or via a notice on the platform.
                        </p>
                    </section>
                </Card>
            </div>
        </div>
    );
}
