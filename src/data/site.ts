export const SITE = {
  name: 'Bishweshwar Shome',
  title: 'Bishweshwar Shome — Senior Software Engineer',
  description: 'Senior Software Engineer specializing in Go, distributed systems, high-throughput microservices, and AI workflows. Exploring Rust and Quantum Computing.',
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
    focus: 'AI-driven unit testing workflows, MR diff coverage automation, CI/CD operational efficiency, and cross-repo validation features.',
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
      'Built AI agents and workflows for automated unit-test generation, driving test coverage to 90%+ across multiple core repositories.',
      'Developed AI-powered MR diff coverage workflows to identify uncovered changed lines and automatically generate targeted unit tests, preventing coverage regressions.',
      'Led cross-repository feature enhancement introducing `fail_if_invalid_reference`, improving reference validation flexibility and customer experience.',
      'Improved CI/CD quality and operational efficiency through approved base image/template enforcement, enhanced error-bundle diagnostics, and security/runtime cost optimization.',
    ],
    skills: ['Go', 'Python', 'AI Agents', 'GenAI / LLMs', 'CI/CD Pipelines', 'Docker', 'Distributed Systems'],
  },
  {
    company: 'IBM',
    role: 'Sr. Golang Developer',
    period: 'Oct 2024 – Nov 2025',
    location: 'Bengaluru, India',
    subcontract: 'via Abacus Staffing and Services',
    highlights: [
      'Contributed to IBM Cloud VPC Overlay services, engineering components for Load Balancer VPC, Virtual Private Endpoint (VPE) access, and underlying networking infrastructure.',
      'Developed and enhanced robust backend microservices primarily in Go, with supporting integration components in Python.',
    ],
    skills: ['Go', 'Python', 'Cloud VPC', 'Overlay Networks', 'Load Balancing', 'Microservices', 'Distributed Systems'],
  },
  {
    company: 'HCL Technologies',
    role: 'Sr. Golang Developer',
    period: 'Jan 2024 – Oct 2024',
    location: 'Bengaluru, India',
    subcontract: 'via Pinaki Softcon Pvt. Ltd.',
    highlights: [
      'Engineered high-performance REST APIs for IT asset management using Go and the Goa framework.',
      'Streamlined inter-service communication using gRPC, managed cloud infrastructure with AWS and Terraform, and structured MySQL data stores for high query concurrency.',
    ],
    skills: ['Go', 'Goa Framework', 'gRPC', 'AWS', 'Terraform', 'MySQL', 'REST APIs'],
  },
  {
    company: 'Prescience Insilico Pvt. Ltd.',
    role: 'Software Developer',
    period: 'Jan 2022 – Sept 2023',
    location: 'Bengaluru, India',
    highlights: [
      'Developed high-throughput scientific applications for drug design and materials simulation using Python and Docker, reducing Docker image footprint by 56% and automating compute pipelines.',
      'Achieved ~50% faster startup time for the flagship PrinS3 application utilizing Python, Bash, and container profiling.',
      'Led the architecture and implementation of the Data Connector module, enhancing cross-system data integration and overall PrinS3 runtime performance.',
      'Engineered Material Insight simulation tool from scratch utilizing Python, NumPy, PyQt, Pandas, Matplotlib, Seaborn, and Scikit-learn.',
    ],
    skills: ['Python', 'Docker', 'Bash', 'NumPy', 'Pandas', 'Scikit-learn', 'PyQt', 'Performance Optimization'],
  },
  {
    company: 'Hamac Computech Solutions',
    role: 'Software Developer',
    period: 'July 2019 – Dec 2021',
    location: 'Bengaluru, India',
    highlights: [
      'Architected and implemented RESTful backend APIs for e-commerce and web platforms using Go, Python, and MongoDB.',
      'Led backend operations, service reliability, and schema design across multiple client projects.',
    ],
    skills: ['Go', 'Python', 'MongoDB', 'REST APIs', 'Backend Architecture'],
  },
];

export const EDUCATION = [
  {
    degree: 'Master of Computer Science (M.Sc.)',
    institution: 'Visva-Bharati University',
    period: '2017 – 2019',
    coursework: [
      'Quantum Computing',
      'Artificial Intelligence',
      'Cryptography & Network Security',
      'Advanced Data Structures',
      'Distributed Systems',
      'Algorithmic Graph Theory',
    ],
  },
  {
    degree: 'Bachelor of Computer Science (B.Sc. Hons.)',
    institution: 'Visva-Bharati University',
    period: '2014 – 2017',
    coursework: ['Data Structures & Algorithms', 'Operating Systems', 'Database Management Systems', 'Computer Networks'],
  },
];

export const SKILL_CATEGORIES = [
  {
    title: 'Languages',
    skills: ['Go (Golang)', 'Python', 'Rust', 'SQL', 'Bash'],
  },
  {
    title: 'Backend & Systems',
    skills: ['gRPC', 'REST APIs', 'Goa', 'Gin', 'Fiber', 'Flask', 'Microservices Architecture'],
  },
  {
    title: 'Distributed Systems & Databases',
    skills: ['Redis', 'PostgreSQL', 'MySQL', 'MongoDB', 'Rate Limiting', 'Failover Systems', 'Sharding'],
  },
  {
    title: 'Cloud & Infrastructure',
    skills: ['AWS', 'GCP', 'Docker', 'Terraform', 'VPC Networking', 'CI/CD Pipelines'],
  },
  {
    title: 'AI & Engineering Productivity',
    skills: ['LLMs', 'GenAI', 'AI Agents', 'AI-assisted Development', 'MR Diff Coverage Automation'],
  },
  {
    title: 'Emerging Research',
    skills: ['Quantum Computing (QGA)', 'Post-Quantum Crypto', 'Zero-Allocation Systems'],
  },
];
