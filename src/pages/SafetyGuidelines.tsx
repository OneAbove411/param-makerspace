import React from 'react';
import { Card } from '../components/ui/Card';

export function SafetyGuidelines() {
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen p-6 pt-32 pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10">
                    <p className="font-data text-xs text-brutal-red uppercase tracking-widest mb-2">Legal</p>
                    <h1 className="font-heading font-bold text-4xl md:text-5xl uppercase tracking-tight-heading text-brutal-dark mb-3">
                        Safety Guidelines
                    </h1>
                    <p className="font-data text-xs text-brutal-dark/60 border-l-2 border-brutal-red pl-3">
                        Effective date: 7 April 2026 &nbsp;·&nbsp; Last updated: 7 April 2026
                    </p>
                </div>

                <Card className="p-8 md:p-12 space-y-8 font-data text-sm md:text-base text-brutal-dark/80 leading-relaxed">
                    <section>
                        <p>
                            The Param Makerspace is a hands-on environment where members work with tools, electronics,
                            chemicals, fabrication equipment and digital systems. Your safety, and the safety of those
                            around you, is our highest priority. These Safety Guidelines apply to everyone using
                            Param Foundation's facilities at <strong>ParSEC Jayanagar, Channenahalli and Whitefield</strong>,
                            as well as our online platform. They are issued in line with our duty of care under
                            Indian law (including the Indian Contract Act, 1872, the Bharatiya Nyaya Sanhita, 2023,
                            the Consumer Protection Act, 2019, and applicable Karnataka workplace and fire-safety
                            regulations).
                        </p>
                        <p className="mt-3">
                            By signing up to Param Makerspace and entering any of our facilities, you agree to
                            comply with these guidelines at all times. Failure to do so may result in loss of access,
                            suspension of membership and, where appropriate, civil or criminal liability.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">1. General conduct</h2>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li>Treat every member, mentor, staff member and visitor with respect. Harassment, bullying, discrimination or violence of any kind is strictly prohibited.</li>
                            <li>No running inside the makerspace. Walk, stay aware of your surroundings, and keep aisles and emergency exits clear.</li>
                            <li>Food, drinks, smoking, vaping and intoxicants are not permitted in workshop or laboratory areas.</li>
                            <li>Always tidy up after yourself. Return tools to their designated places and dispose of waste in the correct bins.</li>
                            <li>Children below the age of 14 must be accompanied by a parent or guardian at all times. Members aged 14&ndash;17 may participate only with verifiable parental or guardian consent.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">2. Personal protective equipment (PPE)</h2>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li>Wear closed-toe shoes at all times in workshop areas. Sandals, slippers and bare feet are not allowed.</li>
                            <li>Use safety glasses, gloves, dust masks, ear protection and aprons appropriate to the task. PPE is provided at the entry of each zone.</li>
                            <li>Tie back long hair, secure beards and remove dangling jewellery, scarves or loose clothing before operating any machine.</li>
                            <li>Headphones and earbuds may not be worn while operating power tools, as you must be able to hear alarms and verbal instructions.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">3. Training &amp; equipment authorisation</h2>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li>You must complete the mandatory induction and zone-specific safety training before using any equipment.</li>
                            <li>Never operate a machine or tool you have not been certified for. Certifications are tracked against your maker profile.</li>
                            <li>If you are unsure how to use a tool, stop and ask a mentor or staff member. There is no penalty for asking.</li>
                            <li>If a machine is making strange noises, smoking, sparking, or has an "Out of Order" tag, do not use it. Inform staff immediately.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">4. Electrical, fire &amp; chemical safety</h2>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li>Do not modify, overload or bypass electrical outlets, extension cords or fuses.</li>
                            <li>Know the location of the nearest fire extinguisher, fire alarm, first-aid kit and emergency exit in every zone you work in.</li>
                            <li>Soldering, laser cutting, 3D printing with hot ends, welding and any open-flame work must be carried out only in designated areas with proper ventilation.</li>
                            <li>Chemicals, adhesives, solvents and batteries must be stored in their labelled cabinets and disposed of via the marked hazardous-waste bins. Never pour chemicals down the sink.</li>
                            <li>Lithium-ion batteries must be charged on the designated fire-safe trays and never left unattended overnight.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">5. Digital &amp; data safety</h2>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li>Do not share your account credentials with anyone, including other members.</li>
                            <li>Do not upload malware, exploits or content that infringes intellectual-property rights.</li>
                            <li>Respect the privacy of fellow makers. Do not photograph, record or share another person's project, face or work without their consent.</li>
                            <li>Report security vulnerabilities responsibly to <a href="mailto:info@paraminnovation.org" className="text-brutal-red font-bold">info@paraminnovation.org</a>.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">6. Incident reporting</h2>
                        <p>
                            Any injury, near-miss, equipment failure or unsafe behaviour <strong>must be reported to a mentor or staff
                            member immediately</strong>, no matter how small it appears. We maintain an internal incident log and use
                            it to continuously improve our practices.
                        </p>
                        <p className="mt-3">In case of a serious medical or fire emergency, call:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-1.5">
                            <li><strong>Ambulance / Emergency Medical:</strong> 108</li>
                            <li><strong>Fire Service:</strong> 101</li>
                            <li><strong>Police:</strong> 100 / 112</li>
                            <li><strong>Param Makerspace front desk:</strong> +91 99806 25752 / +91 73385 80197</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">7. Liability &amp; assumption of risk</h2>
                        <p>
                            You acknowledge that working with tools, machinery, electricity and chemicals carries
                            inherent risk, and that you participate at the Param Makerspace voluntarily and at your
                            own risk. To the maximum extent permitted by Indian law, you agree that Param Foundation,
                            its trustees, employees, mentors and volunteers shall not be liable for any injury,
                            illness, damage or loss arising out of your failure to follow these Safety Guidelines,
                            instructions issued by staff, or applicable laws.
                        </p>
                        <p className="mt-3">
                            Nothing in this section limits any liability that cannot lawfully be excluded under Indian
                            law, including liability for death or personal injury caused by gross negligence on the
                            part of Param Foundation.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">8. Enforcement</h2>
                        <p>
                            Mentors and staff have the authority to stop any activity they consider unsafe and to ask
                            any member or visitor to leave the facility. Repeated or serious breaches of these
                            guidelines may lead to suspension or permanent revocation of access, in addition to any
                            legal consequences.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-heading font-bold text-xl uppercase text-brutal-dark mb-3">9. Updates</h2>
                        <p>
                            These Safety Guidelines are reviewed periodically. The current version is always
                            available on this page. By continuing to use the Services after an update, you agree to
                            the revised guidelines.
                        </p>
                    </section>
                </Card>
            </div>
        </div>
    );
}
