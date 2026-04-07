import React from 'react';
import { Card } from '../components/ui/Card';

export function TermsOfService() {
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen p-6 pt-32 pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10">
                    <p className="font-data text-xs text-brutal-red uppercase tracking-widest mb-2">Legal</p>
                    <h1 className="font-heading font-bold text-4xl md:text-5xl uppercase tracking-tight-heading text-brutal-dark mb-3">
                        Terms of Service
                    </h1>
                    <p className="font-data text-xs text-brutal-dark/60 border-l-2 border-brutal-red pl-3">
                        Effective date: 7 April 2026 &nbsp;·&nbsp; Last updated: 7 April 2026
                    </p>
                </div>

                <Card className="p-8 md:p-12 space-y-8 font-data text-sm md:text-base text-brutal-dark/80 leading-relaxed">
                    <section>
                        <p>
                            Welcome to <strong>Param Makerspace</strong>, an online platform operated by
                            <strong> Param Foundation</strong>, a public charitable trust registered in India and
                            also operating under the brand <em>Param Innovation</em>. These Terms of Service ("Terms")
                            form a legally binding agreement between you and Param Foundation governing your access
                            to and use of the Param Makerspace website, mobile views, related applications and the
                            physical experience-and-maker facilities at ParSEC Jayanagar, Channenahalli and
                            Whitefield (together, the "Services").
                        </p>
                        <p className="mt-3">
                            By creating an account, clicking "Sign Up", or otherwise using the Services, you confirm
                            that you have read, understood and agree to be bound by these Terms and our
                            <a href="/privacy" className="text-brutal-red font-bold"> Privacy Policy</a> and
                            <a href="/safety" className="text-brutal-red font-bold"> Safety Guidelines</a>. If you do
                            not agree, please do not use the Services.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">1. Eligibility</h2>
                        <p>
                            You must be at least 18 years old to register an account on your own. If you are below 18,
                            you may use the Services only with the verifiable consent of a parent or lawful guardian,
                            in line with Section 9 of the Digital Personal Data Protection Act, 2023. By using the
                            Services, you represent that the information you provide is accurate and up to date.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">2. Your account</h2>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li>You are responsible for maintaining the confidentiality of your login credentials and for all activity that takes place under your account.</li>
                            <li>You must notify us immediately at <a href="mailto:info@paraminnovation.org" className="text-brutal-red font-bold">info@paraminnovation.org</a> of any unauthorised access or security breach.</li>
                            <li>You may not create more than one account, impersonate any other person, or use another user's account.</li>
                            <li>We may suspend or terminate accounts that violate these Terms or that put the safety of the community at risk.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">3. Acceptable use</h2>
                        <p>You agree not to, and not to allow any third party to:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li>Use the Services for any unlawful, fraudulent, harmful or harassing purpose.</li>
                            <li>Upload, post or transmit any content that is defamatory, obscene, infringing, hateful, or that violates any law in force in India, including the Information Technology Act, 2000 and rules made thereunder.</li>
                            <li>Attempt to gain unauthorised access to any portion of the Services, other accounts, computer systems or networks connected to the Services.</li>
                            <li>Reverse engineer, decompile, scrape or otherwise extract source code or data from the platform except as permitted by law.</li>
                            <li>Use the Services to infringe the intellectual property rights of Param Foundation or any third party.</li>
                            <li>Disrupt or interfere with the security, integrity or performance of the Services.</li>
                        </ul>
                        <p className="mt-3">
                            As an intermediary under Section 79 of the Information Technology Act, 2000 and the
                            Intermediary Guidelines and Digital Media Ethics Code Rules, 2021, we may remove content
                            that is found to violate these Terms or applicable law.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">4. User content &amp; intellectual property</h2>
                        <p>
                            You retain ownership of the projects, designs, code, photographs, text and other content
                            you submit to the platform ("User Content"). By submitting User Content, you grant Param
                            Foundation a worldwide, royalty-free, non-exclusive, sub-licensable licence to host,
                            store, reproduce, display, adapt and distribute that content solely for the purposes of
                            operating, promoting and improving the Services and showcasing the work of the Param
                            community (for example on the Makers Directory, project pages and social media).
                        </p>
                        <p className="mt-3">
                            All Param Foundation trademarks, logos, course material, exhibits, software code and
                            curated curricula remain the exclusive property of Param Foundation and are protected
                            under the Copyright Act, 1957 and the Trade Marks Act, 1999. You may not use them
                            without prior written permission, except as expressly allowed under fair-dealing
                            provisions of Indian copyright law.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">5. Programs, events &amp; in-person participation</h2>
                        <p>
                            Some Services involve attendance at our physical facilities or participation in workshops,
                            challenges and events. By participating, you additionally agree to our
                            <a href="/safety" className="text-brutal-red font-bold"> Safety Guidelines</a> and to any
                            specific instructions issued by Param staff or mentors. We reserve the right to refuse
                            entry, terminate participation or remove any participant who poses a safety risk or
                            violates our rules.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">6. Fees, payments &amp; donations</h2>
                        <p>
                            Most features of the Param Makerspace platform are free of charge. Some workshops, store
                            items, memberships or events may carry a fee or suggested donation, which will be clearly
                            disclosed before you commit. Donations to Param Foundation are eligible for tax benefits
                            under Section 80G of the Income Tax Act, 1961 to the extent permitted by our valid
                            registrations. Refunds, where applicable, will follow the policy displayed on the relevant
                            event or store page.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">7. Disclaimers</h2>
                        <p>
                            The Services are provided on an "as is" and "as available" basis. To the maximum extent
                            permitted by law, Param Foundation disclaims all warranties, whether express or implied,
                            including warranties of merchantability, fitness for a particular purpose, accuracy and
                            non-infringement. We do not warrant that the Services will be uninterrupted, secure or
                            error-free, or that any defects will be corrected.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">8. Limitation of liability</h2>
                        <p>
                            To the maximum extent permitted by Indian law, Param Foundation, its trustees, employees,
                            mentors, volunteers and service providers shall not be liable for any indirect,
                            incidental, special, consequential or punitive damages, or for any loss of profits,
                            data, goodwill or other intangible losses, arising out of or in connection with your use
                            of the Services. Nothing in these Terms limits or excludes any liability that cannot be
                            limited or excluded under applicable Indian law (including liability for death or personal
                            injury caused by gross negligence).
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">9. Indemnity</h2>
                        <p>
                            You agree to indemnify and hold harmless Param Foundation, its trustees, employees and
                            volunteers from any claims, damages, liabilities, costs and expenses (including reasonable
                            legal fees) arising out of (a) your breach of these Terms, (b) your violation of any law
                            or third-party right, or (c) any User Content you submit.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">10. Termination</h2>
                        <p>
                            You may stop using the Services at any time by deleting your account. We may suspend or
                            terminate your access immediately, with or without notice, if you violate these Terms,
                            applicable law, or if we are required to do so by a competent authority. Upon termination,
                            the rights granted to you under these Terms will end, but provisions that by their nature
                            should survive termination (such as intellectual-property, disclaimers, limitation of
                            liability and governing law) will continue to apply.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">11. Governing law &amp; jurisdiction</h2>
                        <p>
                            These Terms and any dispute arising out of or in connection with them or the Services
                            shall be governed by and construed in accordance with the laws of India. Subject to the
                            grievance-redressal process described in our Privacy Policy, you and Param Foundation
                            agree to submit to the exclusive jurisdiction of the competent courts at
                            <strong> Bengaluru, Karnataka, India</strong>.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">12. Changes to these Terms</h2>
                        <p>
                            We may revise these Terms from time to time. The most current version will always be
                            posted on this page with an updated "Last updated" date. If a change is material, we will
                            make reasonable efforts to notify you (for example by email or an in-app notice). Your
                            continued use of the Services after the revised Terms become effective constitutes your
                            acceptance of them.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">13. Contact</h2>
                        <p>
                            Questions about these Terms can be sent to
                            <a href="mailto:info@paraminnovation.org" className="text-brutal-red font-bold"> info@paraminnovation.org</a> or by post to:
                        </p>
                        <p className="mt-2 pl-4 border-l-2 border-brutal-red/40">
                            Param Foundation, No. 4, 31st Cross, 16th Main, 4th Block, Jayanagar,
                            Bengaluru, Karnataka – 560011, India.
                        </p>
                    </section>
                </Card>
            </div>
        </div>
    );
}
