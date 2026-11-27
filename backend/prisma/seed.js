const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { calculateGPA } = require('../src/utils/gpa');

const prisma = new PrismaClient();

// ─── helpers ─────────────────────────────────────────────────
const uid  = () => crypto.randomUUID();
const now  = () => new Date();
const hash = (pw) => bcrypt.hash(pw, 10);

async function upsertUser(email, name, role, pw, extra = {}) {
  return prisma.user.upsert({
    where:  { institutionalEmail: email },
    update: { password: pw, emailVerified: true, ...extra },
    create: {
      id: uid(), name, institutionalEmail: email,
      password: pw, role, emailVerified: true,
      isFirstLogin: false, updatedAt: now(),
      ...extra,
    },
  });
}

async function main() {
  const pw   = await hash('Test123!');
  const year = new Date().getFullYear();

  // ══════════════════════════════════════════════════════════════
  // 1. DEPARTMENTS  (10 departments)
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding departments...');
  const deptData = [
    { code: 'GEN',   name: 'General Studies',              description: 'Default department for undeclared programs' },
    { code: 'CS',    name: 'Computer Science',             description: 'Computing, software engineering, and AI' },
    { code: 'IT',    name: 'Information Technology',       description: 'Network infrastructure, systems administration, and IT support' },
    { code: 'EE',    name: 'Electrical Engineering',       description: 'Electrical, electronic, and computer engineering' },
    { code: 'ME',    name: 'Mechanical Engineering',       description: 'Mechanical systems, thermodynamics, and manufacturing' },
    { code: 'CE',    name: 'Civil Engineering',            description: 'Structural, geotechnical, and environmental engineering' },
    { code: 'BUS',   name: 'Business Administration',      description: 'Business, management, and entrepreneurship' },
    { code: 'ECON',  name: 'Economics',                    description: 'Micro/macroeconomics, development, and policy' },
    { code: 'NUR',   name: 'Nursing',                      description: 'Nursing, patient care, and public health' },
    { code: 'PHARM', name: 'Pharmacy',                     description: 'Pharmaceutical sciences and clinical pharmacy' },
    { code: 'MATH',  name: 'Mathematics & Statistics',     description: 'Pure/applied mathematics and statistics' },
    { code: 'ENGL',  name: 'English & Communication',      description: 'English language, academic writing, and communication' },
  ];

  const depts = {};
  for (const d of deptData) {
    const existing = await prisma.department.findUnique({ where: { code: d.code } });
    depts[d.code]  = existing ?? await prisma.department.create({
      data: { id: uid(), ...d, updatedAt: now() },
    });
  }
  console.log(`  ✓ ${Object.keys(depts).length} departments`);

  // ══════════════════════════════════════════════════════════════
  // 2. PROGRAMS  (12 programs)
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding programs...');
  const progData = [
    { code: 'UND',    name: 'Undeclared',                      type: 'UNDECLARED', deptCode: 'GEN',   years: 4, credits: 120 },
    { code: 'BSCS',   name: 'B.Sc. Computer Science',          type: 'DECLARED',   deptCode: 'CS',    years: 4, credits: 128 },
    { code: 'BSIT',   name: 'B.Sc. Information Technology',    type: 'DECLARED',   deptCode: 'IT',    years: 4, credits: 124 },
    { code: 'BSEE',   name: 'B.Sc. Electrical Engineering',    type: 'DECLARED',   deptCode: 'EE',    years: 4, credits: 132 },
    { code: 'BSME',   name: 'B.Sc. Mechanical Engineering',    type: 'DECLARED',   deptCode: 'ME',    years: 4, credits: 132 },
    { code: 'BSCE',   name: 'B.Sc. Civil Engineering',         type: 'DECLARED',   deptCode: 'CE',    years: 4, credits: 130 },
    { code: 'BSBA',   name: 'B.Sc. Business Administration',   type: 'DECLARED',   deptCode: 'BUS',   years: 4, credits: 120 },
    { code: 'BSECON', name: 'B.Sc. Economics',                 type: 'DECLARED',   deptCode: 'ECON',  years: 4, credits: 120 },
    { code: 'BSNUR',  name: 'B.Sc. Nursing',                   type: 'DECLARED',   deptCode: 'NUR',   years: 4, credits: 130 },
    { code: 'BSPHARM',name: 'B.Sc. Pharmacy',                  type: 'DECLARED',   deptCode: 'PHARM', years: 5, credits: 160 },
    { code: 'BSMATH', name: 'B.Sc. Mathematics',               type: 'DECLARED',   deptCode: 'MATH',  years: 4, credits: 120 },
  ];

  const progs = {};
  for (const p of progData) {
    const existing = await prisma.program.findUnique({ where: { code: p.code } });
    progs[p.code]  = existing ?? await prisma.program.create({
      data: {
        id: uid(), name: p.name, code: p.code, type: p.type,
        departmentId: depts[p.deptCode].id,
        durationYears: p.years, totalCredits: p.credits,
        degreeLevel: 'BACHELOR', updatedAt: now(),
      },
    });
  }
  console.log(`  ✓ ${Object.keys(progs).length} programs`);

  // ══════════════════════════════════════════════════════════════
  // 3. SEMESTERS
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding semesters...');
  let activeSem = await prisma.academicSemester.findFirst({ where: { isActive: true } });
  if (!activeSem) {
    const existing = await prisma.academicSemester.findFirst({ where: { type: 'FALL', year } });
    activeSem = existing ?? await prisma.academicSemester.create({
      data: {
        id: uid(), name: `Fall ${year}`, type: 'FALL', year,
        startDate:          new Date(`${year}-09-01`),
        endDate:            new Date(`${year}-12-31`),
        registrationStart:  new Date(`${year}-08-01`),
        registrationEnd:    new Date(`${year}-08-31`),
        dropDeadline:       new Date(`${year}-09-15`),
        addDeadline:        new Date(`${year}-09-10`),
        isActive: true, updatedAt: now(),
      },
    });
  }

  // Spring next year (inactive – used for pre-registration tests)
  const sprYear   = year + 1;
  let springSem   = await prisma.academicSemester.findFirst({ where: { type: 'SPRING', year: sprYear } });
  if (!springSem) {
    springSem = await prisma.academicSemester.create({
      data: {
        id: uid(), name: `Spring ${sprYear}`, type: 'SPRING', year: sprYear,
        startDate:          new Date(`${sprYear}-01-15`),
        endDate:            new Date(`${sprYear}-05-31`),
        registrationStart:  new Date(`${year}-12-01`),
        registrationEnd:    new Date(`${year}-12-31`),
        dropDeadline:       new Date(`${sprYear}-02-01`),
        addDeadline:        new Date(`${sprYear}-01-25`),
        isActive: false, updatedAt: now(),
      },
    });
  }
  console.log(`  ✓ Active: ${activeSem.name}  |  Next: ${springSem.name}`);

  // ══════════════════════════════════════════════════════════════
  // 4. SYSTEM USERS  (admin, registrar, dean)
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding system users...');
  await upsertUser('admin@atlas.edu',         'Admin User',           'ADMIN',      pw, { adminRole: 'SUPER_ADMIN' });
  await upsertUser('registrar@atlas.edu',     'Sara Registrar',       'REGISTRAR',  pw);
  await upsertUser('registrar2@atlas.edu',    'Mekdes Registrar',     'REGISTRAR',  pw);
  console.log('  ✓ admin, 2 registrars');

  // ══════════════════════════════════════════════════════════════
  // 5. INSTRUCTORS  (15 instructors across departments)
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding instructors...');
  const instructorData = [
    // CS
    { email: 'dr.alem@atlas.edu',      name: 'Dr. Alem Bekele',      empId: 'INS001', deptCode: 'CS',    title: 'Associate Professor', spec: 'Algorithms & Data Structures',  degree: 'PhD' },
    { email: 'dr.meron@atlas.edu',     name: 'Dr. Meron Tadesse',    empId: 'INS002', deptCode: 'CS',    title: 'Assistant Professor', spec: 'Software Engineering & AI',     degree: 'PhD' },
    // IT
    { email: 'mr.biniam@atlas.edu',    name: 'Mr. Biniam Gebre',     empId: 'INS003', deptCode: 'IT',    title: 'Lecturer',            spec: 'Network Security & Cloud',      degree: 'MSc' },
    // EE
    { email: 'dr.tigist@atlas.edu',    name: 'Dr. Tigist Haile',     empId: 'INS004', deptCode: 'EE',    title: 'Professor',           spec: 'Circuit Design & Power',        degree: 'PhD' },
    { email: 'dr.habtamu@atlas.edu',   name: 'Dr. Habtamu Zewdie',   empId: 'INS005', deptCode: 'EE',    title: 'Associate Professor', spec: 'Embedded Systems',              degree: 'PhD' },
    // ME
    { email: 'dr.kibrom@atlas.edu',    name: 'Dr. Kibrom Tsegay',    empId: 'INS006', deptCode: 'ME',    title: 'Professor',           spec: 'Thermodynamics & Fluid Mech.',  degree: 'PhD' },
    // CE
    { email: 'dr.mekdes@atlas.edu',    name: 'Dr. Mekdes Worku',     empId: 'INS007', deptCode: 'CE',    title: 'Associate Professor', spec: 'Structural & Geotechnical Eng', degree: 'PhD' },
    // BUS
    { email: 'dr.samuel@atlas.edu',    name: 'Dr. Samuel Girma',     empId: 'INS008', deptCode: 'BUS',   title: 'Lecturer',            spec: 'Business Strategy & Finance',   degree: 'MBA' },
    { email: 'dr.senait@atlas.edu',    name: 'Dr. Senait Alemu',     empId: 'INS009', deptCode: 'BUS',   title: 'Assistant Professor', spec: 'Marketing & Entrepreneurship',  degree: 'PhD' },
    // ECON
    { email: 'dr.yared@atlas.edu',     name: 'Dr. Yared Desta',      empId: 'INS010', deptCode: 'ECON',  title: 'Associate Professor', spec: 'Development Economics',         degree: 'PhD' },
    // NUR
    { email: 'dr.yonas@atlas.edu',     name: 'Dr. Yonas Alemu',      empId: 'INS011', deptCode: 'NUR',   title: 'Senior Lecturer',     spec: 'Clinical Nursing',              degree: 'MSc' },
    // PHARM
    { email: 'dr.selamawit@atlas.edu', name: 'Dr. Selamawit Bekele', empId: 'INS012', deptCode: 'PHARM', title: 'Associate Professor', spec: 'Pharmacology & Toxicology',     degree: 'PhD' },
    // MATH
    { email: 'dr.tewodros@atlas.edu',  name: 'Dr. Tewodros Mehari',  empId: 'INS013', deptCode: 'MATH',  title: 'Professor',           spec: 'Applied Mathematics',           degree: 'PhD' },
    { email: 'ms.hiwot@atlas.edu',     name: 'Ms. Hiwot Girma',      empId: 'INS014', deptCode: 'MATH',  title: 'Lecturer',            spec: 'Statistics & Probability',      degree: 'MSc' },
    // ENGL
    { email: 'ms.rahel@atlas.edu',     name: 'Ms. Rahel Tesfaye',    empId: 'INS015', deptCode: 'ENGL',  title: 'Lecturer',            spec: 'Academic Writing & Rhetoric',   degree: 'MA'  },
  ];

  const instructors = {};
  for (const ins of instructorData) {
    const user = await upsertUser(ins.email, ins.name, 'INSTRUCTOR', pw);
    let profile  = await prisma.instructor.findUnique({ where: { userId: user.id } });
    if (!profile) {
      const byEmpId = await prisma.instructor.findUnique({ where: { employeeId: ins.empId } });
      profile = byEmpId ?? await prisma.instructor.create({
        data: {
          id: uid(), userId: user.id, employeeId: ins.empId,
          departmentId: depts[ins.deptCode].id,
          title: ins.title, specialization: ins.spec,
          highestDegree: ins.degree, updatedAt: now(),
        },
      });
    }
    instructors[ins.empId] = profile;
  }
  console.log(`  ✓ ${Object.keys(instructors).length} instructors`);

  // ── Assign department heads ─────────────────────────────────
  const deptHeadAssignments = [
    { deptCode: 'CS',    empId: 'INS001' },
    { deptCode: 'IT',    empId: 'INS003' },
    { deptCode: 'EE',    empId: 'INS004' },
    { deptCode: 'ME',    empId: 'INS006' },
    { deptCode: 'CE',    empId: 'INS007' },
    { deptCode: 'BUS',   empId: 'INS008' },
    { deptCode: 'ECON',  empId: 'INS010' },
    { deptCode: 'NUR',   empId: 'INS011' },
    { deptCode: 'PHARM', empId: 'INS012' },
    { deptCode: 'MATH',  empId: 'INS013' },
  ];
  for (const a of deptHeadAssignments) {
    if (depts[a.deptCode] && instructors[a.empId]) {
      await prisma.department.update({
        where: { id: depts[a.deptCode].id },
        data: { headId: instructors[a.empId].id },
      });
    }
  }
  console.log(`  ✓ ${deptHeadAssignments.length} department heads assigned`);

  // ══════════════════════════════════════════════════════════════
  // 6. COURSES  (50 courses across all departments)
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding courses...');
  const courseData = [
    // ── Computer Science ───────────────────────────────────────
    { code: 'CS101',  title: 'Introduction to Programming',       deptCode: 'CS',    credits: 3, desc: 'Fundamentals of programming using Python' },
    { code: 'CS102',  title: 'Object-Oriented Programming',       deptCode: 'CS',    credits: 3, desc: 'OOP concepts using Java: classes, inheritance, polymorphism' },
    { code: 'CS201',  title: 'Data Structures',                   deptCode: 'CS',    credits: 3, desc: 'Arrays, linked lists, stacks, queues, trees, graphs' },
    { code: 'CS202',  title: 'Database Systems',                  deptCode: 'CS',    credits: 3, desc: 'Relational databases, SQL, normalization, transactions' },
    { code: 'CS301',  title: 'Algorithms',                        deptCode: 'CS',    credits: 3, desc: 'Algorithm design: sorting, searching, dynamic programming, complexity' },
    { code: 'CS302',  title: 'Operating Systems',                 deptCode: 'CS',    credits: 3, desc: 'Processes, memory management, file systems, concurrency' },
    { code: 'CS303',  title: 'Computer Networks',                 deptCode: 'CS',    credits: 3, desc: 'TCP/IP, routing, transport layer, network security basics' },
    { code: 'CS401',  title: 'Software Engineering',              deptCode: 'CS',    credits: 3, desc: 'SDLC, design patterns, agile methods, testing' },
    { code: 'CS402',  title: 'Artificial Intelligence',           deptCode: 'CS',    credits: 3, desc: 'Search, knowledge representation, ML introduction' },
    { code: 'CS403',  title: 'Machine Learning',                  deptCode: 'CS',    credits: 3, desc: 'Supervised/unsupervised learning, neural networks' },
    { code: 'CS404',  title: 'Web Development',                   deptCode: 'CS',    credits: 3, desc: 'HTML/CSS, JavaScript, REST APIs, full-stack development' },
    { code: 'CS405',  title: 'Mobile Application Development',    deptCode: 'CS',    credits: 3, desc: 'Android/iOS dev, React Native, UX principles' },
    { code: 'CS490',  title: 'Senior Capstone Project I',         deptCode: 'CS',    credits: 2, desc: 'First semester of two-semester capstone project' },
    // ── Information Technology ─────────────────────────────────
    { code: 'IT101',  title: 'IT Fundamentals',                   deptCode: 'IT',    credits: 3, desc: 'Hardware, software, OS, and basic troubleshooting' },
    { code: 'IT201',  title: 'Networking Essentials',             deptCode: 'IT',    credits: 3, desc: 'Network topologies, protocols, Cisco basics' },
    { code: 'IT301',  title: 'Cybersecurity Fundamentals',        deptCode: 'IT',    credits: 3, desc: 'Threats, firewalls, encryption, ethical hacking introduction' },
    { code: 'IT302',  title: 'Cloud Computing',                   deptCode: 'IT',    credits: 3, desc: 'IaaS, PaaS, SaaS, AWS/Azure/GCP fundamentals' },
    { code: 'IT401',  title: 'IT Project Management',             deptCode: 'IT',    credits: 3, desc: 'Project planning, PMBOK, agile for IT teams' },
    // ── Electrical Engineering ─────────────────────────────────
    { code: 'EE101',  title: 'Circuit Theory',                    deptCode: 'EE',    credits: 3, desc: 'Basic circuit analysis: KVL, KCL, Thevenin, Norton' },
    { code: 'EE102',  title: 'Engineering Mathematics',           deptCode: 'EE',    credits: 3, desc: 'Complex numbers, Laplace transforms, Fourier series for EE' },
    { code: 'EE201',  title: 'Electronics I',                     deptCode: 'EE',    credits: 3, desc: 'Diodes, BJTs, MOSFETs, amplifier circuits' },
    { code: 'EE202',  title: 'Signals & Systems',                 deptCode: 'EE',    credits: 3, desc: 'Continuous/discrete signals, Fourier/Laplace/Z transforms' },
    { code: 'EE301',  title: 'Microprocessors & Microcontrollers',deptCode: 'EE',    credits: 3, desc: 'ARM architecture, assembly language, embedded C' },
    { code: 'EE302',  title: 'Power Systems',                     deptCode: 'EE',    credits: 3, desc: 'Generation, transmission, distribution, power quality' },
    { code: 'EE401',  title: 'Control Systems',                   deptCode: 'EE',    credits: 3, desc: 'Feedback control, stability, root locus, PID controllers' },
    // ── Mechanical Engineering ─────────────────────────────────
    { code: 'ME101',  title: 'Engineering Drawing & CAD',         deptCode: 'ME',    credits: 2, desc: 'Technical drawing, AutoCAD, SolidWorks fundamentals' },
    { code: 'ME201',  title: 'Statics & Dynamics',                deptCode: 'ME',    credits: 3, desc: 'Equilibrium, kinematics, kinetics of particles and rigid bodies' },
    { code: 'ME202',  title: 'Thermodynamics I',                  deptCode: 'ME',    credits: 3, desc: 'Laws of thermodynamics, work, heat, cycles' },
    { code: 'ME301',  title: 'Fluid Mechanics',                   deptCode: 'ME',    credits: 3, desc: 'Fluid statics, Bernoulli, flow in pipes, turbomachinery' },
    { code: 'ME401',  title: 'Machine Design',                    deptCode: 'ME',    credits: 3, desc: 'Stress analysis, fatigue, gears, shafts, bearings' },
    // ── Civil Engineering ──────────────────────────────────────
    { code: 'CE101',  title: 'Engineering Surveying',             deptCode: 'CE',    credits: 3, desc: 'Levelling, traversing, GPS and total station use' },
    { code: 'CE201',  title: 'Structural Analysis',               deptCode: 'CE',    credits: 3, desc: 'Beams, trusses, frames, influence lines' },
    { code: 'CE301',  title: 'Reinforced Concrete Design',        deptCode: 'CE',    credits: 3, desc: 'ACI code, beams, slabs, columns, footings' },
    { code: 'CE302',  title: 'Soil Mechanics',                    deptCode: 'CE',    credits: 3, desc: 'Soil classification, permeability, consolidation, shear strength' },
    { code: 'CE401',  title: 'Highway Engineering',               deptCode: 'CE',    credits: 3, desc: 'Geometric design, pavement design, traffic engineering' },
    // ── Business Administration ────────────────────────────────
    { code: 'BUS101', title: 'Principles of Management',          deptCode: 'BUS',   credits: 3, desc: 'Management theories, planning, organizing, leadership' },
    { code: 'BUS102', title: 'Principles of Marketing',           deptCode: 'BUS',   credits: 3, desc: 'Market segmentation, 4Ps, consumer behavior' },
    { code: 'BUS201', title: 'Financial Accounting',              deptCode: 'BUS',   credits: 3, desc: 'Accounting principles, journal entries, financial statements' },
    { code: 'BUS202', title: 'Managerial Accounting',             deptCode: 'BUS',   credits: 3, desc: 'Cost analysis, budgeting, variance analysis' },
    { code: 'BUS301', title: 'Business Law',                      deptCode: 'BUS',   credits: 3, desc: 'Contracts, torts, company law, intellectual property' },
    { code: 'BUS302', title: 'Entrepreneurship',                  deptCode: 'BUS',   credits: 3, desc: 'Business planning, venture creation, startup finance' },
    { code: 'BUS401', title: 'Strategic Management',              deptCode: 'BUS',   credits: 3, desc: 'SWOT, Porter, competitive strategy, strategic implementation' },
    // ── Economics ─────────────────────────────────────────────
    { code: 'ECON101',title: 'Microeconomics',                    deptCode: 'ECON',  credits: 3, desc: 'Supply and demand, consumer theory, market structures' },
    { code: 'ECON102',title: 'Macroeconomics',                    deptCode: 'ECON',  credits: 3, desc: 'GDP, inflation, unemployment, fiscal and monetary policy' },
    { code: 'ECON201',title: 'Development Economics',             deptCode: 'ECON',  credits: 3, desc: 'Growth theories, poverty, inequality, African development' },
    // ── Nursing ───────────────────────────────────────────────
    { code: 'NUR101', title: 'Fundamentals of Nursing',           deptCode: 'NUR',   credits: 4, desc: 'Core nursing concepts, patient assessment, basic care' },
    { code: 'NUR102', title: 'Anatomy & Physiology I',            deptCode: 'NUR',   credits: 3, desc: 'Cells, tissues, musculoskeletal and cardiovascular systems' },
    { code: 'NUR201', title: 'Clinical Practice I',               deptCode: 'NUR',   credits: 4, desc: 'Supervised clinical nursing in medical-surgical units' },
    { code: 'NUR301', title: 'Pharmacology for Nurses',           deptCode: 'NUR',   credits: 3, desc: 'Drug classifications, dosage calculations, nursing implications' },
    // ── Pharmacy ──────────────────────────────────────────────
    { code: 'PHARM101',title: 'Pharmaceutical Chemistry I',       deptCode: 'PHARM', credits: 3, desc: 'Organic chemistry for pharmacy, functional groups, drug synthesis' },
    { code: 'PHARM201',title: 'Pharmacology I',                   deptCode: 'PHARM', credits: 3, desc: 'Pharmacokinetics, pharmacodynamics, drug-receptor interaction' },
    { code: 'PHARM301',title: 'Clinical Pharmacy Practice',       deptCode: 'PHARM', credits: 4, desc: 'Patient counseling, drug therapy review, ADR reporting' },
    // ── Mathematics & Statistics ──────────────────────────────
    { code: 'MATH101', title: 'Calculus I',                       deptCode: 'MATH',  credits: 3, desc: 'Limits, derivatives, and definite integrals' },
    { code: 'MATH102', title: 'Calculus II',                      deptCode: 'MATH',  credits: 3, desc: 'Integration techniques, series, multivariable intro' },
    { code: 'MATH201', title: 'Linear Algebra',                   deptCode: 'MATH',  credits: 3, desc: 'Vectors, matrices, determinants, eigenvalues' },
    { code: 'MATH202', title: 'Probability & Statistics',         deptCode: 'MATH',  credits: 3, desc: 'Probability axioms, distributions, inference, regression' },
    { code: 'MATH301', title: 'Differential Equations',           deptCode: 'MATH',  credits: 3, desc: 'ODEs, systems, Laplace solutions, numerical methods' },
    // ── English & Communication ────────────────────────────────
    { code: 'ENGL101', title: 'Communicative English',            deptCode: 'ENGL',  credits: 3, desc: 'Grammar review, reading comprehension, oral communication' },
    { code: 'ENGL102', title: 'Academic Writing',                 deptCode: 'ENGL',  credits: 3, desc: 'Essay writing, research papers, citation styles' },
  ];

  const courses = {};
  for (const c of courseData) {
    const existing = await prisma.course.findUnique({ where: { code: c.code } });
    courses[c.code] = existing ?? await prisma.course.create({
      data: {
        id: uid(), code: c.code, title: c.title,
        description: c.desc, credits: c.credits,
        departmentId: depts[c.deptCode].id,
        semesterId: activeSem.id,
        maxStudents: 40, updatedAt: now(),
      },
    });
  }
  console.log(`  ✓ ${Object.keys(courses).length} courses`);

  // ══════════════════════════════════════════════════════════════
  // 7. SECTIONS  (one or two sections per high-demand course)
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding sections...');
  const sectionData = [
    // CS
    { courseCode: 'CS101',   name: 'A', empId: 'INS001' },
    { courseCode: 'CS101',   name: 'B', empId: 'INS002' },
    { courseCode: 'CS102',   name: 'A', empId: 'INS002' },
    { courseCode: 'CS201',   name: 'A', empId: 'INS001' },
    { courseCode: 'CS201',   name: 'B', empId: 'INS002' },
    { courseCode: 'CS202',   name: 'A', empId: 'INS001' },
    { courseCode: 'CS301',   name: 'A', empId: 'INS001' },
    { courseCode: 'CS302',   name: 'A', empId: 'INS002' },
    { courseCode: 'CS303',   name: 'A', empId: 'INS003' },
    { courseCode: 'CS401',   name: 'A', empId: 'INS002' },
    { courseCode: 'CS402',   name: 'A', empId: 'INS002' },
    { courseCode: 'CS403',   name: 'A', empId: 'INS002' },
    { courseCode: 'CS404',   name: 'A', empId: 'INS001' },
    { courseCode: 'CS405',   name: 'A', empId: 'INS002' },
    { courseCode: 'CS490',   name: 'A', empId: 'INS001' },
    // IT
    { courseCode: 'IT101',   name: 'A', empId: 'INS003' },
    { courseCode: 'IT201',   name: 'A', empId: 'INS003' },
    { courseCode: 'IT301',   name: 'A', empId: 'INS003' },
    { courseCode: 'IT302',   name: 'A', empId: 'INS003' },
    { courseCode: 'IT401',   name: 'A', empId: 'INS003' },
    // EE
    { courseCode: 'EE101',   name: 'A', empId: 'INS004' },
    { courseCode: 'EE101',   name: 'B', empId: 'INS005' },
    { courseCode: 'EE102',   name: 'A', empId: 'INS004' },
    { courseCode: 'EE201',   name: 'A', empId: 'INS004' },
    { courseCode: 'EE202',   name: 'A', empId: 'INS005' },
    { courseCode: 'EE301',   name: 'A', empId: 'INS005' },
    { courseCode: 'EE302',   name: 'A', empId: 'INS004' },
    { courseCode: 'EE401',   name: 'A', empId: 'INS005' },
    // ME
    { courseCode: 'ME101',   name: 'A', empId: 'INS006' },
    { courseCode: 'ME201',   name: 'A', empId: 'INS006' },
    { courseCode: 'ME202',   name: 'A', empId: 'INS006' },
    { courseCode: 'ME301',   name: 'A', empId: 'INS006' },
    { courseCode: 'ME401',   name: 'A', empId: 'INS006' },
    // CE
    { courseCode: 'CE101',   name: 'A', empId: 'INS007' },
    { courseCode: 'CE201',   name: 'A', empId: 'INS007' },
    { courseCode: 'CE301',   name: 'A', empId: 'INS007' },
    { courseCode: 'CE302',   name: 'A', empId: 'INS007' },
    { courseCode: 'CE401',   name: 'A', empId: 'INS007' },
    // BUS
    { courseCode: 'BUS101',  name: 'A', empId: 'INS008' },
    { courseCode: 'BUS101',  name: 'B', empId: 'INS009' },
    { courseCode: 'BUS102',  name: 'A', empId: 'INS009' },
    { courseCode: 'BUS201',  name: 'A', empId: 'INS008' },
    { courseCode: 'BUS202',  name: 'A', empId: 'INS008' },
    { courseCode: 'BUS301',  name: 'A', empId: 'INS008' },
    { courseCode: 'BUS302',  name: 'A', empId: 'INS009' },
    { courseCode: 'BUS401',  name: 'A', empId: 'INS008' },
    // ECON
    { courseCode: 'ECON101', name: 'A', empId: 'INS010' },
    { courseCode: 'ECON102', name: 'A', empId: 'INS010' },
    { courseCode: 'ECON201', name: 'A', empId: 'INS010' },
    // NUR
    { courseCode: 'NUR101',  name: 'A', empId: 'INS011' },
    { courseCode: 'NUR102',  name: 'A', empId: 'INS011' },
    { courseCode: 'NUR201',  name: 'A', empId: 'INS011' },
    { courseCode: 'NUR301',  name: 'A', empId: 'INS011' },
    // PHARM
    { courseCode: 'PHARM101',name: 'A', empId: 'INS012' },
    { courseCode: 'PHARM201',name: 'A', empId: 'INS012' },
    { courseCode: 'PHARM301',name: 'A', empId: 'INS012' },
    // MATH
    { courseCode: 'MATH101', name: 'A', empId: 'INS013' },
    { courseCode: 'MATH101', name: 'B', empId: 'INS014' },
    { courseCode: 'MATH102', name: 'A', empId: 'INS013' },
    { courseCode: 'MATH201', name: 'A', empId: 'INS013' },
    { courseCode: 'MATH202', name: 'A', empId: 'INS014' },
    { courseCode: 'MATH301', name: 'A', empId: 'INS013' },
    // ENGL
    { courseCode: 'ENGL101', name: 'A', empId: 'INS015' },
    { courseCode: 'ENGL101', name: 'B', empId: 'INS015' },
    { courseCode: 'ENGL102', name: 'A', empId: 'INS015' },
  ];

  const sections = {};
  for (const s of sectionData) {
    const key        = `${s.courseCode}-${s.name}`;
    const sectionCode = `${s.courseCode}-${s.name}`;
    // Look up by sectionCode (unique) to handle re-runs with different active semesters
    const existing = await prisma.section.findUnique({ where: { sectionCode } });
    sections[key] = existing ?? await prisma.section.create({
      data: {
        id: uid(),
        courseId:     courses[s.courseCode].id,
        name:         s.name,
        sectionCode,
        instructorId: instructors[s.empId].id,
        semesterId:   activeSem.id,
        departmentId: courses[s.courseCode].departmentId,
        maxStudents:  30,
        updatedAt:    now(),
      },
    });
  }
  console.log(`  ✓ ${Object.keys(sections).length} sections`);

  // ══════════════════════════════════════════════════════════════
  // 8. STUDENTS  (30 students across all programs)
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding students...');
  const studentData = [
    // ── CS (6) ─────────────────────────────────────────────────
    { email: 'abel.tesfaye@atlas.edu.et',      name: 'Abel Tesfaye',       sid: 'CS-26-0001',  progCode: 'BSCS',    deptCode: 'CS',    yr: 1 },
    { email: 'blen.hailu@atlas.edu.et',        name: 'Blen Hailu',         sid: 'CS-26-0002',  progCode: 'BSCS',    deptCode: 'CS',    yr: 1 },
    { email: 'chala.bekele@atlas.edu.et',      name: 'Chala Bekele',       sid: 'CS-26-0003',  progCode: 'BSCS',    deptCode: 'CS',    yr: 1 },
    { email: 'jana.solomon@atlas.edu.et',      name: 'Jana Solomon',       sid: 'CS-26-0004',  progCode: 'BSCS',    deptCode: 'CS',    yr: 2 },
    { email: 'liya.habtamu@atlas.edu.et',      name: 'Liya Habtamu',       sid: 'CS-26-0005',  progCode: 'BSCS',    deptCode: 'CS',    yr: 2 },
    { email: 'naol.bekele@atlas.edu.et',       name: 'Naol Bekele',        sid: 'CS-26-0006',  progCode: 'BSCS',    deptCode: 'CS',    yr: 3 },
    // ── IT (3) ────────────────────────────────────────────────
    { email: 'obsa.geleta@atlas.edu.et',       name: 'Obsa Geleta',        sid: 'IT-26-0001',  progCode: 'BSIT',    deptCode: 'IT',    yr: 1 },
    { email: 'pita.woldemariam@atlas.edu.et',  name: 'Pita Woldemariam',   sid: 'IT-26-0002',  progCode: 'BSIT',    deptCode: 'IT',    yr: 2 },
    { email: 'qemal.ibrahim@atlas.edu.et',     name: 'Qemal Ibrahim',      sid: 'IT-26-0003',  progCode: 'BSIT',    deptCode: 'IT',    yr: 3 },
    // ── EE (4) ────────────────────────────────────────────────
    { email: 'dawit.girma@atlas.edu.et',       name: 'Dawit Girma',        sid: 'EE-26-0001',  progCode: 'BSEE',    deptCode: 'EE',    yr: 1 },
    { email: 'eyerusalem.alemu@atlas.edu.et',  name: 'Eyerusalem Alemu',   sid: 'EE-26-0002',  progCode: 'BSEE',    deptCode: 'EE',    yr: 1 },
    { email: 'kaleb.desta@atlas.edu.et',       name: 'Kaleb Desta',        sid: 'EE-26-0003',  progCode: 'BSEE',    deptCode: 'EE',    yr: 2 },
    { email: 'rahwa.tsegay@atlas.edu.et',      name: 'Rahwa Tsegay',       sid: 'EE-26-0004',  progCode: 'BSEE',    deptCode: 'EE',    yr: 3 },
    // ── ME (3) ────────────────────────────────────────────────
    { email: 'saron.mulugeta@atlas.edu.et',    name: 'Saron Mulugeta',     sid: 'ME-26-0001',  progCode: 'BSME',    deptCode: 'ME',    yr: 1 },
    { email: 'tesfaye.kebede@atlas.edu.et',    name: 'Tesfaye Kebede',     sid: 'ME-26-0002',  progCode: 'BSME',    deptCode: 'ME',    yr: 2 },
    { email: 'urge.wolde@atlas.edu.et',        name: 'Urge Wolde',         sid: 'ME-26-0003',  progCode: 'BSME',    deptCode: 'ME',    yr: 3 },
    // ── CE (3) ────────────────────────────────────────────────
    { email: 'venus.girma@atlas.edu.et',       name: 'Venus Girma',        sid: 'CE-26-0001',  progCode: 'BSCE',    deptCode: 'CE',    yr: 1 },
    { email: 'wondim.abebe@atlas.edu.et',      name: 'Wondim Abebe',       sid: 'CE-26-0002',  progCode: 'BSCE',    deptCode: 'CE',    yr: 2 },
    { email: 'xena.tesfaye@atlas.edu.et',      name: 'Xena Tesfaye',       sid: 'CE-26-0003',  progCode: 'BSCE',    deptCode: 'CE',    yr: 3 },
    // ── BUS (4) ───────────────────────────────────────────────
    { email: 'fikadu.tadesse@atlas.edu.et',    name: 'Fikadu Tadesse',     sid: 'BUS-26-0001', progCode: 'BSBA',    deptCode: 'BUS',   yr: 1 },
    { email: 'genet.worku@atlas.edu.et',       name: 'Genet Worku',        sid: 'BUS-26-0002', progCode: 'BSBA',    deptCode: 'BUS',   yr: 1 },
    { email: 'yeshi.haile@atlas.edu.et',       name: 'Yeshi Haile',        sid: 'BUS-26-0003', progCode: 'BSBA',    deptCode: 'BUS',   yr: 2 },
    { email: 'zewdu.alemu@atlas.edu.et',       name: 'Zewdu Alemu',        sid: 'BUS-26-0004', progCode: 'BSBA',    deptCode: 'BUS',   yr: 3 },
    // ── NUR (4) ───────────────────────────────────────────────
    { email: 'henok.mekonen@atlas.edu.et',     name: 'Henok Mekonen',      sid: 'NUR-26-0001', progCode: 'BSNUR',   deptCode: 'NUR',   yr: 1 },
    { email: 'israel.kebede@atlas.edu.et',     name: 'Israel Kebede',      sid: 'NUR-26-0002', progCode: 'BSNUR',   deptCode: 'NUR',   yr: 1 },
    { email: 'jemila.ahmed@atlas.edu.et',      name: 'Jemila Ahmed',       sid: 'NUR-26-0003', progCode: 'BSNUR',   deptCode: 'NUR',   yr: 2 },
    { email: 'kifle.habtewold@atlas.edu.et',   name: 'Kifle Habtewold',    sid: 'NUR-26-0004', progCode: 'BSNUR',   deptCode: 'NUR',   yr: 3 },
    // ── PHARM (2) ─────────────────────────────────────────────
    { email: 'lidiya.asefa@atlas.edu.et',      name: 'Lidiya Asefa',       sid: 'PH-26-0001',  progCode: 'BSPHARM', deptCode: 'PHARM', yr: 1 },
    { email: 'mulugeta.habtamu@atlas.edu.et',  name: 'Mulugeta Habtamu',   sid: 'PH-26-0002',  progCode: 'BSPHARM', deptCode: 'PHARM', yr: 2 },
    // ── MATH (1) ──────────────────────────────────────────────
    { email: 'nigist.wolde@atlas.edu.et',      name: 'Nigist Wolde',       sid: 'MTH-26-0001', progCode: 'BSMATH',  deptCode: 'MATH',  yr: 1 },
  ];

  const students = {};
  for (const s of studentData) {
    const user    = await upsertUser(s.email, s.name, 'STUDENT', pw);
    let profile   = await prisma.student.findUnique({ where: { userId: user.id } });
    if (!profile) {
      const gpaByYear = { 1: 0.0, 2: 3.1, 3: 3.4 };
      const crByYear  = { 1: 0,   2: 32,  3: 64  };
      profile = await prisma.student.create({
        data: {
          id: uid(), userId: user.id, studentId: s.sid,
          firstName:       s.name.split(' ')[0],
          fatherName:      s.name.split(' ')[1] || '',
          email:           s.email,
          enrollmentYear:  year - (s.yr - 1),
          currentYear:     s.yr,
          currentSemester: 'FALL',
          programId:       progs[s.progCode].id,
          departmentId:    depts[s.deptCode].id,
          currentSemesterId: activeSem.id,
          status:          'ACTIVE',
          cumulativeGPA:   gpaByYear[s.yr] ?? 0.0,
          totalCredits:    crByYear[s.yr]  ?? 0,
          profileCompleted: true, isFirstLogin: false,
          updatedAt:       now(),
        },
      });
    }
    students[s.sid] = profile;
  }
  console.log(`  ✓ ${Object.keys(students).length} students`);

  // ══════════════════════════════════════════════════════════════
  // 9. ENROLLMENT MAP  (which sections each student takes)
  // ══════════════════════════════════════════════════════════════
  const enrollmentMap = {
    // CS Year-1
    'CS-26-0001':  ['CS101-A', 'MATH101-A', 'ENGL101-A'],
    'CS-26-0002':  ['CS101-A', 'MATH101-B', 'ENGL101-B'],
    'CS-26-0003':  ['CS101-B', 'MATH101-A', 'ENGL101-A'],
    // CS Year-2
    'CS-26-0004':  ['CS201-A', 'CS202-A',   'MATH201-A', 'ENGL102-A'],
    'CS-26-0005':  ['CS201-B', 'CS202-A',   'MATH201-A'],
    // CS Year-3
    'CS-26-0006':  ['CS301-A', 'CS302-A',   'CS303-A',   'CS401-A'],
    // IT Year-1
    'IT-26-0001':  ['IT101-A', 'MATH101-A', 'ENGL101-A'],
    // IT Year-2
    'IT-26-0002':  ['IT201-A', 'IT301-A',   'MATH202-A'],
    // IT Year-3
    'IT-26-0003':  ['IT302-A', 'IT401-A',   'CS303-A'],
    // EE Year-1
    'EE-26-0001':  ['EE101-A', 'EE102-A',   'MATH101-A', 'ENGL101-A'],
    'EE-26-0002':  ['EE101-B', 'EE102-A',   'MATH101-B', 'ENGL101-B'],
    // EE Year-2
    'EE-26-0003':  ['EE201-A', 'EE202-A',   'MATH201-A'],
    // EE Year-3
    'EE-26-0004':  ['EE301-A', 'EE302-A',   'EE401-A'],
    // ME Year-1
    'ME-26-0001':  ['ME101-A', 'MATH101-A', 'ENGL101-A'],
    // ME Year-2
    'ME-26-0002':  ['ME201-A', 'ME202-A',   'MATH102-A'],
    // ME Year-3
    'ME-26-0003':  ['ME301-A', 'ME401-A'],
    // CE Year-1
    'CE-26-0001':  ['CE101-A', 'MATH101-B', 'ENGL101-B'],
    // CE Year-2
    'CE-26-0002':  ['CE201-A', 'CE302-A',   'MATH201-A'],
    // CE Year-3
    'CE-26-0003':  ['CE301-A', 'CE401-A'],
    // BUS Year-1
    'BUS-26-0001': ['BUS101-A', 'BUS102-A', 'ENGL101-A', 'ECON101-A'],
    'BUS-26-0002': ['BUS101-B', 'BUS102-A', 'ENGL101-B', 'ECON101-A'],
    // BUS Year-2
    'BUS-26-0003': ['BUS201-A', 'BUS202-A', 'BUS301-A',  'ECON102-A'],
    // BUS Year-3
    'BUS-26-0004': ['BUS302-A', 'BUS401-A'],
    // NUR Year-1
    'NUR-26-0001': ['NUR101-A', 'NUR102-A', 'ENGL101-A'],
    'NUR-26-0002': ['NUR101-A', 'NUR102-A', 'ENGL101-B'],
    // NUR Year-2
    'NUR-26-0003': ['NUR201-A', 'NUR301-A'],
    // NUR Year-3
    'NUR-26-0004': ['NUR201-A', 'NUR301-A'],
    // PHARM Year-1
    'PH-26-0001':  ['PHARM101-A', 'MATH101-A', 'ENGL101-A'],
    // PHARM Year-2
    'PH-26-0002':  ['PHARM201-A', 'PHARM301-A'],
    // MATH Year-1
    'MTH-26-0001': ['MATH101-A', 'MATH102-A', 'ENGL101-A'],
  };

  // ── Grades for upper-year students (simulate historical records) ──
  const gradeMap = {
    // CS Year-2
    'CS-26-0004': {
      'CS201-A': { grade: 87, letter: 'B+' },
      'CS202-A': { grade: 91, letter: 'A'  },
    },
    'CS-26-0005': {
      'CS201-B': { grade: 76, letter: 'B'  },
    },
    // CS Year-3
    'CS-26-0006': {
      'CS301-A': { grade: 94, letter: 'A'  },
      'CS302-A': { grade: 88, letter: 'B+' },
    },
    // EE Year-2
    'EE-26-0003': {
      'EE201-A': { grade: 82, letter: 'B+' },
      'EE202-A': { grade: 78, letter: 'B'  },
    },
    // EE Year-3
    'EE-26-0004': {
      'EE301-A': { grade: 90, letter: 'A'  },
      'EE302-A': { grade: 85, letter: 'B+' },
    },
    // BUS Year-2
    'BUS-26-0003': {
      'BUS201-A': { grade: 80, letter: 'B+' },
      'BUS202-A': { grade: 75, letter: 'B'  },
    },
    // BUS Year-3
    'BUS-26-0004': {
      'BUS302-A': { grade: 92, letter: 'A'  },
      'BUS401-A': { grade: 88, letter: 'B+' },
    },
    // NUR Year-3
    'NUR-26-0004': {
      'NUR201-A': { grade: 86, letter: 'B+' },
      'NUR301-A': { grade: 89, letter: 'B+' },
    },
  };

  // ══════════════════════════════════════════════════════════════
  // 10. SECTION ENROLLMENTS
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding section enrollments...');
  let enrollCount = 0;
  for (const [sid, sectionKeys] of Object.entries(enrollmentMap)) {
    const student = students[sid];
    if (!student) continue;
    for (const key of sectionKeys) {
      const section = sections[key];
      if (!section) { console.warn(`    ⚠ section not found: ${key}`); continue; }
      const existing = await prisma.sectionEnrollment.findUnique({
        where: { studentId_sectionId: { studentId: student.id, sectionId: section.id } },
      });
      if (!existing) {
        const gi = gradeMap[sid]?.[key];
        await prisma.sectionEnrollment.create({
          data: {
            id:          uid(),
            studentId:   student.id,
            sectionId:   section.id,
            grade:       gi?.grade  ?? null,
            letterGrade: gi?.letter ?? null,
            status:      gi ? 'COMPLETED' : 'ENROLLED',
          },
        });
        enrollCount++;
      }
    }
  }
  console.log(`  ✓ ${enrollCount} section enrollments`);

  // ══════════════════════════════════════════════════════════════
  // 10b. RECALCULATE GPA FOR ALL STUDENTS FROM REAL GRADES
  // ══════════════════════════════════════════════════════════════
  console.log('Recalculating student GPAs from seed grades...');
  let gpaCount = 0;
  for (const student of Object.values(students)) {
    const enrollments = await prisma.sectionEnrollment.findMany({
      where: { studentId: student.id },
      include: { section: { include: { course: { select: { credits: true } } } } },
    });
    const gpaData = enrollments.map(e => ({
      letterGrade: e.letterGrade,
      credits: e.section?.course?.credits ?? 0,
    }));
    const gpa = calculateGPA(gpaData);
    if (gpa > 0) {
      await prisma.student.update({
        where: { id: student.id },
        data: { cumulativeGPA: gpa },
      });
      gpaCount++;
    }
  }
  console.log(`  ✓ GPA recalculated for ${gpaCount} students`);

  // ══════════════════════════════════════════════════════════════
  // 11. LEGACY COURSE ENROLLMENTS
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding legacy course enrollments...');
  let legacyCount = 0;
  for (const [sid, sectionKeys] of Object.entries(enrollmentMap)) {
    const student = students[sid];
    if (!student) continue;
    for (const key of sectionKeys) {
      const section = sections[key];
      if (!section) continue;
      const existing = await prisma.enrollment.findUnique({
        where: { studentId_courseId_semesterId: {
          studentId:  student.id,
          courseId:   section.courseId,
          semesterId: activeSem.id,
        }},
      });
      if (!existing) {
        const gi = gradeMap[sid]?.[key];
        await prisma.enrollment.create({
          data: {
            id:          uid(),
            studentId:   student.id,
            courseId:    section.courseId,
            semesterId:  activeSem.id,
            status:      gi ? 'COMPLETED' : 'ENROLLED',
            grade:       gi?.grade  ?? null,
            letterGrade: gi?.letter ?? null,
          },
        });
        await prisma.course.update({
          where: { id: section.courseId },
          data:  { currentEnrollment: { increment: 1 } },
        });
        legacyCount++;
      }
    }
  }
  console.log(`  ✓ ${legacyCount} legacy enrollments`);

  // ══════════════════════════════════════════════════════════════
  // 12. PROGRAM CURRICULUM LINKS
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding program curriculum...');
  const curriculumData = [
    // BSCS
    { progCode: 'BSCS',    courseCode: 'ENGL101',  sem: 1, yr: 1 },
    { progCode: 'BSCS',    courseCode: 'MATH101',  sem: 1, yr: 1 },
    { progCode: 'BSCS',    courseCode: 'CS101',    sem: 1, yr: 1 },
    { progCode: 'BSCS',    courseCode: 'CS102',    sem: 2, yr: 1 },
    { progCode: 'BSCS',    courseCode: 'MATH102',  sem: 2, yr: 1 },
    { progCode: 'BSCS',    courseCode: 'CS201',    sem: 1, yr: 2 },
    { progCode: 'BSCS',    courseCode: 'CS202',    sem: 1, yr: 2 },
    { progCode: 'BSCS',    courseCode: 'MATH201',  sem: 1, yr: 2 },
    { progCode: 'BSCS',    courseCode: 'ENGL102',  sem: 2, yr: 2 },
    { progCode: 'BSCS',    courseCode: 'CS301',    sem: 1, yr: 3 },
    { progCode: 'BSCS',    courseCode: 'CS302',    sem: 1, yr: 3 },
    { progCode: 'BSCS',    courseCode: 'CS303',    sem: 2, yr: 3 },
    { progCode: 'BSCS',    courseCode: 'CS401',    sem: 1, yr: 4 },
    { progCode: 'BSCS',    courseCode: 'CS402',    sem: 1, yr: 4 },
    { progCode: 'BSCS',    courseCode: 'CS403',    sem: 2, yr: 4 },
    { progCode: 'BSCS',    courseCode: 'CS404',    sem: 2, yr: 4 },
    { progCode: 'BSCS',    courseCode: 'CS490',    sem: 1, yr: 4 },
    // BSIT
    { progCode: 'BSIT',    courseCode: 'IT101',    sem: 1, yr: 1 },
    { progCode: 'BSIT',    courseCode: 'MATH101',  sem: 1, yr: 1 },
    { progCode: 'BSIT',    courseCode: 'ENGL101',  sem: 1, yr: 1 },
    { progCode: 'BSIT',    courseCode: 'IT201',    sem: 1, yr: 2 },
    { progCode: 'BSIT',    courseCode: 'IT301',    sem: 2, yr: 2 },
    { progCode: 'BSIT',    courseCode: 'MATH202',  sem: 2, yr: 2 },
    { progCode: 'BSIT',    courseCode: 'IT302',    sem: 1, yr: 3 },
    { progCode: 'BSIT',    courseCode: 'IT401',    sem: 2, yr: 3 },
    { progCode: 'BSIT',    courseCode: 'CS303',    sem: 2, yr: 3 },
    // BSEE
    { progCode: 'BSEE',    courseCode: 'EE101',    sem: 1, yr: 1 },
    { progCode: 'BSEE',    courseCode: 'EE102',    sem: 1, yr: 1 },
    { progCode: 'BSEE',    courseCode: 'MATH101',  sem: 1, yr: 1 },
    { progCode: 'BSEE',    courseCode: 'ENGL101',  sem: 1, yr: 1 },
    { progCode: 'BSEE',    courseCode: 'EE201',    sem: 1, yr: 2 },
    { progCode: 'BSEE',    courseCode: 'EE202',    sem: 2, yr: 2 },
    { progCode: 'BSEE',    courseCode: 'MATH201',  sem: 2, yr: 2 },
    { progCode: 'BSEE',    courseCode: 'EE301',    sem: 1, yr: 3 },
    { progCode: 'BSEE',    courseCode: 'EE302',    sem: 2, yr: 3 },
    { progCode: 'BSEE',    courseCode: 'EE401',    sem: 1, yr: 4 },
    // BSME
    { progCode: 'BSME',    courseCode: 'ME101',    sem: 1, yr: 1 },
    { progCode: 'BSME',    courseCode: 'MATH101',  sem: 1, yr: 1 },
    { progCode: 'BSME',    courseCode: 'ENGL101',  sem: 1, yr: 1 },
    { progCode: 'BSME',    courseCode: 'ME201',    sem: 1, yr: 2 },
    { progCode: 'BSME',    courseCode: 'ME202',    sem: 2, yr: 2 },
    { progCode: 'BSME',    courseCode: 'MATH102',  sem: 2, yr: 2 },
    { progCode: 'BSME',    courseCode: 'ME301',    sem: 1, yr: 3 },
    { progCode: 'BSME',    courseCode: 'ME401',    sem: 1, yr: 4 },
    // BSCE
    { progCode: 'BSCE',    courseCode: 'CE101',    sem: 1, yr: 1 },
    { progCode: 'BSCE',    courseCode: 'MATH101',  sem: 1, yr: 1 },
    { progCode: 'BSCE',    courseCode: 'ENGL101',  sem: 1, yr: 1 },
    { progCode: 'BSCE',    courseCode: 'CE201',    sem: 1, yr: 2 },
    { progCode: 'BSCE',    courseCode: 'CE302',    sem: 2, yr: 2 },
    { progCode: 'BSCE',    courseCode: 'MATH201',  sem: 2, yr: 2 },
    { progCode: 'BSCE',    courseCode: 'CE301',    sem: 1, yr: 3 },
    { progCode: 'BSCE',    courseCode: 'CE401',    sem: 1, yr: 4 },
    // BSBA
    { progCode: 'BSBA',    courseCode: 'BUS101',   sem: 1, yr: 1 },
    { progCode: 'BSBA',    courseCode: 'BUS102',   sem: 2, yr: 1 },
    { progCode: 'BSBA',    courseCode: 'ENGL101',  sem: 1, yr: 1 },
    { progCode: 'BSBA',    courseCode: 'ECON101',  sem: 1, yr: 1 },
    { progCode: 'BSBA',    courseCode: 'BUS201',   sem: 1, yr: 2 },
    { progCode: 'BSBA',    courseCode: 'BUS202',   sem: 2, yr: 2 },
    { progCode: 'BSBA',    courseCode: 'BUS301',   sem: 2, yr: 2 },
    { progCode: 'BSBA',    courseCode: 'ECON102',  sem: 2, yr: 2 },
    { progCode: 'BSBA',    courseCode: 'BUS302',   sem: 1, yr: 3 },
    { progCode: 'BSBA',    courseCode: 'BUS401',   sem: 1, yr: 4 },
    // BSECON
    { progCode: 'BSECON',  courseCode: 'ECON101',  sem: 1, yr: 1 },
    { progCode: 'BSECON',  courseCode: 'ECON102',  sem: 2, yr: 1 },
    { progCode: 'BSECON',  courseCode: 'MATH101',  sem: 1, yr: 1 },
    { progCode: 'BSECON',  courseCode: 'ECON201',  sem: 1, yr: 2 },
    // BSNUR
    { progCode: 'BSNUR',   courseCode: 'NUR101',   sem: 1, yr: 1 },
    { progCode: 'BSNUR',   courseCode: 'NUR102',   sem: 2, yr: 1 },
    { progCode: 'BSNUR',   courseCode: 'ENGL101',  sem: 1, yr: 1 },
    { progCode: 'BSNUR',   courseCode: 'NUR201',   sem: 1, yr: 2 },
    { progCode: 'BSNUR',   courseCode: 'NUR301',   sem: 2, yr: 2 },
    // BSPHARM
    { progCode: 'BSPHARM', courseCode: 'PHARM101', sem: 1, yr: 1 },
    { progCode: 'BSPHARM', courseCode: 'MATH101',  sem: 1, yr: 1 },
    { progCode: 'BSPHARM', courseCode: 'ENGL101',  sem: 1, yr: 1 },
    { progCode: 'BSPHARM', courseCode: 'PHARM201', sem: 1, yr: 2 },
    { progCode: 'BSPHARM', courseCode: 'PHARM301', sem: 2, yr: 3 },
    // BSMATH
    { progCode: 'BSMATH',  courseCode: 'MATH101',  sem: 1, yr: 1 },
    { progCode: 'BSMATH',  courseCode: 'MATH102',  sem: 2, yr: 1 },
    { progCode: 'BSMATH',  courseCode: 'ENGL101',  sem: 1, yr: 1 },
    { progCode: 'BSMATH',  courseCode: 'MATH201',  sem: 1, yr: 2 },
    { progCode: 'BSMATH',  courseCode: 'MATH202',  sem: 2, yr: 2 },
    { progCode: 'BSMATH',  courseCode: 'MATH301',  sem: 1, yr: 3 },
  ];

  let currCount = 0;
  for (const c of curriculumData) {
    const existing = await prisma.programCourse.findUnique({
      where: { programId_courseId: { programId: progs[c.progCode].id, courseId: courses[c.courseCode].id } },
    });
    if (!existing) {
      await prisma.programCourse.create({
        data: {
          id:        uid(),
          programId: progs[c.progCode].id,
          courseId:  courses[c.courseCode].id,
          semester:  c.sem, year: c.yr, isRequired: true,
        },
      });
      currCount++;
    }
  }
  console.log(`  ✓ ${currCount} curriculum links`);

  // ══════════════════════════════════════════════════════════════
  // 13. MARKETING DEPARTMENT — FULL 4-YEAR CURRICULUM
  // ══════════════════════════════════════════════════════════════
  console.log('Seeding Marketing department & full curriculum...');

  // Department
  let mktDept = await prisma.department.findUnique({ where: { code: 'MKT' } });
  if (!mktDept) {
    mktDept = await prisma.department.create({
      data: { id: uid(), name: 'Marketing', code: 'MKT', description: 'Marketing, consumer behaviour, and digital strategy', updatedAt: now() },
    });
  }

  // Program
  let mktProg = await prisma.program.findUnique({ where: { code: 'BSMKT' } });
  if (!mktProg) {
    mktProg = await prisma.program.create({
      data: {
        id: uid(), name: 'B.Sc. Marketing', code: 'BSMKT', type: 'DECLARED',
        departmentId: mktDept.id, durationYears: 4, totalCredits: 128,
        degreeLevel: 'BACHELOR', updatedAt: now(),
      },
    });
  }

  // Instructor
  const mktInstructor1 = await upsertUser('dr.tigist.mkt@atlas.edu', 'Dr. Tigist Bekele', 'INSTRUCTOR', pw);
  const mktInstructor2 = await upsertUser('dr.samuel.mkt@atlas.edu', 'Dr. Samuel Haile',  'INSTRUCTOR', pw);
  for (const [u, empId] of [[mktInstructor1, 'MKT001'], [mktInstructor2, 'MKT002']]) {
    const exists = await prisma.instructor.findUnique({ where: { userId: u.id } });
    if (!exists) {
      const byEmp = await prisma.instructor.findUnique({ where: { employeeId: empId } });
      if (!byEmp) {
        await prisma.instructor.create({
          data: { id: uid(), userId: u.id, employeeId: empId, departmentId: mktDept.id, title: 'Associate Professor', updatedAt: now() },
        });
      }
    }
  }

  // Full 4-year curriculum
  const mktCourses = [
    // ── Year 1 Semester 1 ──────────────────────────────────────
    { code: 'MKT101', title: 'Principles of Marketing',        credits: 3, yr: 1, sem: 1 },
    { code: 'BUS101', title: 'Introduction to Business',       credits: 3, yr: 1, sem: 1 },
    { code: 'ECON101',title: 'Microeconomics',                 credits: 3, yr: 1, sem: 1 },
    { code: 'MATH101',title: 'Business Mathematics',           credits: 3, yr: 1, sem: 1 },
    { code: 'ENGL101',title: 'Communicative English',          credits: 3, yr: 1, sem: 1 },
    // ── Year 1 Semester 2 ──────────────────────────────────────
    { code: 'MKT102', title: 'Consumer Behaviour',             credits: 3, yr: 1, sem: 2 },
    { code: 'ECON102',title: 'Macroeconomics',                 credits: 3, yr: 1, sem: 2 },
    { code: 'BUS102', title: 'Business Communication',         credits: 3, yr: 1, sem: 2 },
    { code: 'ACC101', title: 'Accounting I',                   credits: 3, yr: 1, sem: 2 },
    { code: 'STAT101',title: 'Business Statistics',            credits: 3, yr: 1, sem: 2 },
    // ── Year 2 Semester 1 ──────────────────────────────────────
    { code: 'MKT201', title: 'Marketing Research',             credits: 3, yr: 2, sem: 1 },
    { code: 'MKT202', title: 'Product & Brand Management',     credits: 3, yr: 2, sem: 1 },
    { code: 'ACC102', title: 'Accounting II',                  credits: 3, yr: 2, sem: 1 },
    { code: 'MGT201', title: 'Principles of Management',       credits: 3, yr: 2, sem: 1 },
    { code: 'BUS201', title: 'Business Law',                   credits: 3, yr: 2, sem: 1 },
    // ── Year 2 Semester 2 ──────────────────────────────────────
    { code: 'MKT203', title: 'Advertising & Promotion',        credits: 3, yr: 2, sem: 2 },
    { code: 'MKT204', title: 'Sales Management',               credits: 3, yr: 2, sem: 2 },
    { code: 'FIN201', title: 'Financial Management',           credits: 3, yr: 2, sem: 2 },
    { code: 'MGT202', title: 'Organisational Behaviour',       credits: 3, yr: 2, sem: 2 },
    { code: 'IT201',  title: 'Information Systems for Business',credits:3, yr: 2, sem: 2 },
    // ── Year 3 Semester 1 ──────────────────────────────────────
    { code: 'MKT301', title: 'Digital Marketing',              credits: 3, yr: 3, sem: 1 },
    { code: 'MKT302', title: 'International Marketing',        credits: 3, yr: 3, sem: 1 },
    { code: 'MKT303', title: 'Retail & Distribution Management',credits:3, yr: 3, sem: 1 },
    { code: 'ENT301', title: 'Entrepreneurship',               credits: 3, yr: 3, sem: 1 },
    { code: 'STAT301',title: 'Marketing Analytics',            credits: 3, yr: 3, sem: 1 },
    // ── Year 3 Semester 2 ──────────────────────────────────────
    { code: 'MKT304', title: 'Social Media Marketing',         credits: 3, yr: 3, sem: 2 },
    { code: 'MKT305', title: 'Services Marketing',             credits: 3, yr: 3, sem: 2 },
    { code: 'MKT306', title: 'E-Commerce & Digital Strategy',  credits: 3, yr: 3, sem: 2 },
    { code: 'MGT301', title: 'Supply Chain Management',        credits: 3, yr: 3, sem: 2 },
    { code: 'BUS301', title: 'Business Ethics',                credits: 3, yr: 3, sem: 2 },
    // ── Year 4 Semester 1 ──────────────────────────────────────
    { code: 'MKT401', title: 'Strategic Marketing',            credits: 3, yr: 4, sem: 1 },
    { code: 'MKT402', title: 'Marketing Leadership',           credits: 3, yr: 4, sem: 1 },
    { code: 'MKT403', title: 'Integrated Marketing Communications', credits: 3, yr: 4, sem: 1 },
    { code: 'MKT490', title: 'Internship',                     credits: 6, yr: 4, sem: 1 },
    // ── Year 4 Semester 2 ──────────────────────────────────────
    { code: 'MKT491', title: 'Final Year Project I',           credits: 3, yr: 4, sem: 2 },
    { code: 'MKT492', title: 'Final Year Project II',          credits: 3, yr: 4, sem: 2 },
    { code: 'MKT404', title: 'Marketing Capstone Seminar',     credits: 3, yr: 4, sem: 2 },
    { code: 'MKT405', title: 'Contemporary Issues in Marketing',credits:3, yr: 4, sem: 2 },
  ];

  const mktCourseMap = {};
  for (const c of mktCourses) {
    const existing = await prisma.course.findUnique({ where: { code: c.code } });
    mktCourseMap[c.code] = existing ?? await prisma.course.create({
      data: {
        id: uid(), code: c.code, title: c.title, credits: c.credits,
        departmentId: mktDept.id, semesterId: activeSem.id,
        maxStudents: 40, updatedAt: now(),
      },
    });
    // Curriculum link
    const pcExists = await prisma.programCourse.findUnique({
      where: { programId_courseId: { programId: mktProg.id, courseId: mktCourseMap[c.code].id } },
    });
    if (!pcExists) {
      await prisma.programCourse.create({
        data: { id: uid(), programId: mktProg.id, courseId: mktCourseMap[c.code].id, semester: c.sem, year: c.yr, isRequired: true },
      });
    }
  }

  // Create sections for Year 1 courses (active semester)
  const mktY1Courses = mktCourses.filter(c => c.yr === 1);
  const mktInstructorProfile1 = await prisma.instructor.findUnique({ where: { userId: mktInstructor1.id } });
  const mktInstructorProfile2 = await prisma.instructor.findUnique({ where: { userId: mktInstructor2.id } });
  for (const [i, c] of mktY1Courses.entries()) {
    const course = mktCourseMap[c.code];
    const instrId = i % 2 === 0 ? mktInstructorProfile1?.id : mktInstructorProfile2?.id;
    const sectionCode = `${course.code}-A`;
    const exists = await prisma.section.findUnique({ where: { sectionCode } });
    if (!exists && instrId) {
      await prisma.section.create({
        data: {
          id: uid(),
          courseId: course.id,
          name: 'A',
          sectionCode,
          instructorId: instrId,
          semesterId: activeSem.id,
          departmentId: mktDept.id,
          maxStudents: 40,
          updatedAt: now(),
        },
      });
    }
  }

  // Sample Marketing student
  const mktStudentUser = await upsertUser('amira.hassan@atlas.edu.et', 'Amira Hassan', 'STUDENT', pw);
  let mktStudent = await prisma.student.findUnique({ where: { userId: mktStudentUser.id } });
  if (!mktStudent) {
    mktStudent = await prisma.student.create({
      data: {
        id: uid(), userId: mktStudentUser.id, studentId: 'MKT-26-0001',
        firstName: 'Amira', fatherName: 'Hassan', email: 'amira.hassan@atlas.edu.et',
        enrollmentYear: year, currentYear: 1, currentSemester: 'FALL',
        programId: mktProg.id, departmentId: mktDept.id,
        currentSemesterId: activeSem.id, status: 'ACTIVE',
        cumulativeGPA: 0.0, totalCredits: 0, profileCompleted: true, isFirstLogin: false,
        updatedAt: now(),
      },
    });
  }
  console.log('  ✓ Marketing dept, BSMKT program, 38 courses, 2 instructors, 1 student');
  console.log('    Student: amira.hassan@atlas.edu.et / Test123!');

  // ══════════════════════════════════════════════════════════════
  // ✅ SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log('\n✅ Seed completed successfully!');
  console.log('═════════════════════════════════════════════════════════');
  console.log('  All passwords: Test123!');
  console.log('─────────────────────────────────────────────────────────');
  console.log('  SYSTEM');
  console.log('    Admin:       admin@atlas.edu');
  console.log('    Registrar:   registrar@atlas.edu   / registrar2@atlas.edu');
  console.log('─────────────────────────────────────────────────────────');
  console.log('  INSTRUCTORS');
  console.log('    CS:     dr.alem@atlas.edu        dr.meron@atlas.edu');
  console.log('    IT:     mr.biniam@atlas.edu');
  console.log('    EE:     dr.tigist@atlas.edu       dr.habtamu@atlas.edu');
  console.log('    ME:     dr.kibrom@atlas.edu');
  console.log('    CE:     dr.mekdes@atlas.edu');
  console.log('    BUS:    dr.samuel@atlas.edu       dr.senait@atlas.edu');
  console.log('    ECON:   dr.yared@atlas.edu');
  console.log('    NUR:    dr.yonas@atlas.edu');
  console.log('    PHARM:  dr.selamawit@atlas.edu');
  console.log('    MATH:   dr.tewodros@atlas.edu     ms.hiwot@atlas.edu');
  console.log('    ENGL:   ms.rahel@atlas.edu');
  console.log('─────────────────────────────────────────────────────────');
  console.log('  SAMPLE STUDENTS (one per department)');
  console.log('    CS:     abel.tesfaye@atlas.edu.et');
  console.log('    IT:     obsa.geleta@atlas.edu.et');
  console.log('    EE:     dawit.girma@atlas.edu.et');
  console.log('    ME:     saron.mulugeta@atlas.edu.et');
  console.log('    CE:     venus.girma@atlas.edu.et');
  console.log('    BUS:    fikadu.tadesse@atlas.edu.et');
  console.log('    NUR:    henok.mekonen@atlas.edu.et');
  console.log('    PHARM:  lidiya.asefa@atlas.edu.et');
  console.log('    MATH:   nigist.wolde@atlas.edu.et');
  console.log('═════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());