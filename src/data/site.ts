export const SITE = {
  name: 'Bishweshwar Shome',
  title: 'Bishweshwar Shome | SDE III @ F5 | Golang Developer',
  description: 'Official portfolio of Bishweshwar Shome, Software Development Engineer III at F5 specializing in Golang backend architecture and distributed systems.',
  url: 'https://bishweshwar.com',
  email: 'bshome19@gmail.com',
  location: 'Bengaluru, India',
  social: {
    github: 'https://github.com/bshome19',
    linkedin: 'https://www.linkedin.com/in/bshome19/',
    medium: 'https://medium.com/@bshome19',
  },
  currentRole: {
    title: 'SDE III',
    company: 'F5 Networks Innovation Private Limited',
    period: 'Feb 2026 – Sept 2026',
    location: 'Bengaluru, India',
    focus: 'AI agents and workflows for automated unit-test generation, MR diff coverage workflows, and cross-repository feature enhancements.',
  },
};

export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  location: string;
  subcontract?: string;
  highlights: string[];
  skills: string[];
}

export const EXPERIENCES: ExperienceItem[] = [
  {
    company: 'F5 Networks Innovation Private Limited',
    role: 'SDE III',
    period: 'Feb 2026 – Sept 2026',
    location: 'Bengaluru, India',
    highlights: [
      'Built AI agents and workflows for automated unit-test generation, improving test coverage to 90%+ across multiple repositories.',
      'Developed AI-powered MR diff coverage workflows to identify uncovered changed lines and generate targeted unit tests, helping prevent coverage regressions.',
      'Led a cross-repository feature enhancement introducing fail_if_invalid_reference, improving reference validation flexibility and customer experience.',
      'Improved CI/CD quality and operational efficiency through approved base image/template enforcement, enhanced error-bundle diagnostics, and security and runtime cost optimization initiatives.',
    ],
    skills: ['Go', 'Python', 'AI Agents', 'GenAI', 'LLMs', 'CI/CD', 'Docker'],
  },
  {
    company: 'IBM',
    role: 'Sr. Golang Developer',
    period: 'Oct 2024 – Nov 2025',
    location: 'Bengaluru, India',
    subcontract: 'via Abacus Staffing and Services',
    highlights: [
      'Contributed to IBM Cloud VPC Overlay services, working on Load Balancer VPC, VPE access, and networking infrastructure.',
      'Developed and enhanced backend services primarily in Go, with supporting components in Python.',
    ],
    skills: ['Go', 'Python', 'IBM Cloud VPC', 'Overlay Networks', 'Load Balancer VPC', 'VPE Access'],
  },
  {
    company: 'HCL Technologies',
    role: 'Sr. Golang Developer',
    period: 'Jan 2024 – Oct 2024',
    location: 'Bengaluru, India',
    subcontract: 'via Pinaki Softcon Pvt. Ltd.',
    highlights: [
      'Built REST APIs for IT asset management using Go and Goa framework.',
      'Streamlined backend services using gRPC, managed infrastructure with AWS and Terraform, and worked on MySQL-based data storage.',
    ],
    skills: ['Go', 'Goa', 'gRPC', 'AWS', 'Terraform', 'MySQL', 'REST APIs'],
  },
  {
    company: 'Prescience Insilico Pvt. Ltd.',
    role: 'Software Developer',
    period: 'Jan 2022 – Sept 2023',
    location: 'Bengaluru, India',
    highlights: [
      'Developed high-throughput scientific apps for drug design and materials simulation using Python, Docker. Reduced Docker image size by 56% and automated complex workflows.',
      'Achieved around 50% faster startup time for PrinS3 using Python, Bash, and Docker skills.',
      'Led development of the Data Connector, improving data integration and overall PrinS3 performance.',
      'Developed Material insight simulation tool from scratch using Python, NumPy, PyQt, Pandas, Matplotlib, Seaborn, and Scikit-learn.',
    ],
    skills: ['Python', 'Docker', 'Bash', 'NumPy', 'PyQt', 'Pandas', 'Matplotlib', 'Seaborn', 'Scikit-learn'],
  },
  {
    company: 'Hamac Computech Solutions',
    role: 'Software Developer',
    period: 'July 2019 – Dec 2021',
    location: 'Bengaluru, India',
    highlights: [
      'Built APIs for e-commerce and other applications using Go, Python, and MongoDB. Led backend operations across multiple projects.',
    ],
    skills: ['Go', 'Python', 'MongoDB', 'REST APIs', 'Backend Operations'],
  },
];

export const EDUCATION = [
  {
    degree: 'Master of Computer Science',
    institution: 'Visva-Bharati University',
    period: '2017 – 2019',
    coursework: [
      'Quantum Computing',
      'Artificial Intelligence',
      'Cryptography and Network Security',
      'Advanced Data Structure',
      'Distributed System',
      'Algorithmic Graph Theory',
    ],
  },
  {
    degree: 'Bachelor of Computer Science',
    institution: 'Visva-Bharati University',
    period: '2014 – 2017',
  },
];

export const SKILL_CATEGORIES = [
  {
    title: 'Languages',
    skills: ['Go', 'Python', 'Rust', 'SQL', 'Bash'],
  },
  {
    title: 'Backend',
    skills: ['gRPC', 'REST', 'Goa', 'Gin', 'Fiber', 'Flask'],
  },
  {
    title: 'Distributed Systems & Databases',
    skills: ['Microservices', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis'],
  },
  {
    title: 'Cloud & DevOps',
    skills: ['AWS', 'GCP', 'Docker', 'Terraform'],
  },
  {
    title: 'AI',
    skills: ['LLMs', 'GenAI', 'AI Agents', 'AI-assisted Development'],
  },
  {
    title: 'Tools',
    skills: ['Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Postman'],
  },
];

export const INTERESTS = {
  technical: ['Quantum Computing', 'Rust', 'AI/LLMs'],
  personal: ['Chess', 'Trekking', 'Travel', 'Photography', 'Technical Writing (Medium)'],
};
