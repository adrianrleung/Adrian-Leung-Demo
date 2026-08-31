/**
 * Simulated roster for the Employee Directory app: a 60-person startup that
 * has been running for about four years, with the mix of tenures, locations,
 * contract types and lifecycle states a real HR system accumulates.
 */
export interface SeedEmployee {
  name: string;
  title: string;
  department: string;
  team: string;
  manager: string | null;
  location: string;
  employmentType: string;
  /** Months before today that the employee started. */
  tenureMonths: number;
  status: string;
  /** Annual gross in EUR. */
  salary: number;
  equityOptions: number;
  note?: string;
  /** Months before today of the last day, for people on notice or departed. */
  endMonths?: number;
}

export const EMPLOYEES: readonly SeedEmployee[] = [
  // Leadership
  { name: "Adrian Leung", title: "Co-founder & CEO", department: "Operations", team: "Leadership", manager: null, location: "Lisbon", employmentType: "full-time", tenureMonths: 52, status: "active", salary: 140000, equityOptions: 0 },
  { name: "Mariana Costa", title: "Co-founder & CTO", department: "Engineering", team: "Leadership", manager: "Adrian Leung", location: "Lisbon", employmentType: "full-time", tenureMonths: 52, status: "active", salary: 140000, equityOptions: 0 },
  { name: "Priya Nair", title: "VP Product", department: "Product", team: "Leadership", manager: "Adrian Leung", location: "London", employmentType: "full-time", tenureMonths: 41, status: "active", salary: 128000, equityOptions: 40000 },
  { name: "Tomas Novak", title: "VP Sales", department: "Sales", team: "Leadership", manager: "Adrian Leung", location: "Berlin", employmentType: "full-time", tenureMonths: 38, status: "active", salary: 125000, equityOptions: 36000 },
  { name: "Ana Sousa", title: "Head of People", department: "People", team: "Leadership", manager: "Adrian Leung", location: "Lisbon", employmentType: "full-time", tenureMonths: 34, status: "active", salary: 105000, equityOptions: 22000 },
  { name: "Jonas Weber", title: "Head of Finance", department: "Finance", team: "Leadership", manager: "Adrian Leung", location: "Berlin", employmentType: "full-time", tenureMonths: 30, status: "active", salary: 112000, equityOptions: 20000 },
  { name: "Chloe Martin", title: "Head of Design", department: "Design", team: "Leadership", manager: "Priya Nair", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 36, status: "active", salary: 104000, equityOptions: 24000 },
  { name: "Yusuf Demir", title: "Head of Marketing", department: "Marketing", team: "Leadership", manager: "Adrian Leung", location: "Berlin", employmentType: "full-time", tenureMonths: 27, status: "active", salary: 98000, equityOptions: 18000 },
  { name: "Sofia Almeida", title: "Head of Operations", department: "Operations", team: "Business Operations", manager: "Adrian Leung", location: "Lisbon", employmentType: "full-time", tenureMonths: 33, status: "active", salary: 96000, equityOptions: 16000 },

  // Engineering — Platform
  { name: "Diego Alvarez", title: "Staff Engineer", department: "Engineering", team: "Platform", manager: "Mariana Costa", location: "Lisbon", employmentType: "full-time", tenureMonths: 44, status: "active", salary: 108000, equityOptions: 30000 },
  { name: "Hana Kim", title: "Engineering Manager, Platform", department: "Engineering", team: "Platform", manager: "Mariana Costa", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 29, status: "active", salary: 104000, equityOptions: 18000 },
  { name: "Liam Byrne", title: "Senior Backend Engineer", department: "Engineering", team: "Platform", manager: "Hana Kim", location: "Lisbon", employmentType: "full-time", tenureMonths: 26, status: "active", salary: 92000, equityOptions: 12000 },
  { name: "Noor Haddad", title: "Backend Engineer", department: "Engineering", team: "Platform", manager: "Hana Kim", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 14, status: "active", salary: 78000, equityOptions: 7000 },
  { name: "Sven Lindqvist", title: "Site Reliability Engineer", department: "Engineering", team: "Platform", manager: "Hana Kim", location: "Berlin", employmentType: "full-time", tenureMonths: 19, status: "active", salary: 88000, equityOptions: 9000 },
  { name: "Ken Adachi", title: "Backend Engineer", department: "Engineering", team: "Platform", manager: "Hana Kim", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 8, status: "on-leave", salary: 76000, equityOptions: 6000, note: "Parental leave, returns in April" },

  // Engineering — Payments
  { name: "Elena Rossi", title: "Engineering Manager, Payments", department: "Engineering", team: "Payments", manager: "Mariana Costa", location: "Lisbon", employmentType: "full-time", tenureMonths: 31, status: "active", salary: 106000, equityOptions: 20000 },
  { name: "Marco Bianchi", title: "Senior Backend Engineer", department: "Engineering", team: "Payments", manager: "Elena Rossi", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 23, status: "active", salary: 94000, equityOptions: 11000 },
  { name: "Aisha Bello", title: "Backend Engineer", department: "Engineering", team: "Payments", manager: "Elena Rossi", location: "London", employmentType: "full-time", tenureMonths: 17, status: "active", salary: 84000, equityOptions: 8000 },
  { name: "Ingrid Solberg", title: "Payments Integration Engineer", department: "Engineering", team: "Payments", manager: "Elena Rossi", location: "Remote (EU)", employmentType: "contractor", tenureMonths: 6, status: "active", salary: 96000, equityOptions: 0 },

  // Engineering — Web
  { name: "Joana Pinto", title: "Engineering Manager, Web", department: "Engineering", team: "Web", manager: "Mariana Costa", location: "Lisbon", employmentType: "full-time", tenureMonths: 24, status: "active", salary: 100000, equityOptions: 14000 },
  { name: "Oskar Nowak", title: "Senior Frontend Engineer", department: "Engineering", team: "Web", manager: "Joana Pinto", location: "Berlin", employmentType: "full-time", tenureMonths: 21, status: "active", salary: 90000, equityOptions: 10000 },
  { name: "Rita Fernandes", title: "Frontend Engineer", department: "Engineering", team: "Web", manager: "Joana Pinto", location: "Lisbon", employmentType: "full-time", tenureMonths: 13, status: "active", salary: 76000, equityOptions: 6000 },
  { name: "Callum Reid", title: "Frontend Engineer", department: "Engineering", team: "Web", manager: "Joana Pinto", location: "London", employmentType: "full-time", tenureMonths: 9, status: "active", salary: 79000, equityOptions: 5000 },
  { name: "Nadia Haidari", title: "Frontend Engineer", department: "Engineering", team: "Web", manager: "Joana Pinto", location: "Remote (EU)", employmentType: "part-time", tenureMonths: 15, status: "active", salary: 48000, equityOptions: 4000 },

  // Engineering — Data
  { name: "Bruno Teixeira", title: "Data Platform Lead", department: "Engineering", team: "Data", manager: "Mariana Costa", location: "Lisbon", employmentType: "full-time", tenureMonths: 28, status: "active", salary: 98000, equityOptions: 15000 },
  { name: "Lena Fischer", title: "Data Engineer", department: "Engineering", team: "Data", manager: "Bruno Teixeira", location: "Berlin", employmentType: "full-time", tenureMonths: 16, status: "active", salary: 82000, equityOptions: 7000 },
  { name: "Yara Nasser", title: "Analytics Engineer", department: "Engineering", team: "Data", manager: "Bruno Teixeira", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 10, status: "active", salary: 78000, equityOptions: 5000 },
  { name: "Felix Braun", title: "Machine Learning Engineer", department: "Engineering", team: "Data", manager: "Bruno Teixeira", location: "Berlin", employmentType: "full-time", tenureMonths: 7, status: "active", salary: 86000, equityOptions: 5000 },

  // Engineering — Quality & Security
  { name: "Tiago Moreira", title: "QA Lead", department: "Engineering", team: "Quality", manager: "Mariana Costa", location: "Lisbon", employmentType: "full-time", tenureMonths: 25, status: "active", salary: 82000, equityOptions: 9000 },
  { name: "Sara Ellis", title: "QA Engineer", department: "Engineering", team: "Quality", manager: "Tiago Moreira", location: "London", employmentType: "full-time", tenureMonths: 12, status: "active", salary: 70000, equityOptions: 4000 },
  { name: "Ravi Menon", title: "Security Engineer", department: "Engineering", team: "Quality", manager: "Mariana Costa", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 18, status: "active", salary: 95000, equityOptions: 9000 },

  // Product
  { name: "Isabel Duarte", title: "Senior Product Manager", department: "Product", team: "Payments", manager: "Priya Nair", location: "Lisbon", employmentType: "full-time", tenureMonths: 26, status: "active", salary: 95000, equityOptions: 12000 },
  { name: "Daniel Okonkwo", title: "Product Manager", department: "Product", team: "Platform", manager: "Priya Nair", location: "London", employmentType: "full-time", tenureMonths: 15, status: "active", salary: 85000, equityOptions: 7000 },
  { name: "Emma Lindgren", title: "Product Manager", department: "Product", team: "Web", manager: "Priya Nair", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 9, status: "active", salary: 82000, equityOptions: 5000 },

  // Design
  { name: "Camille Roux", title: "Senior Product Designer", department: "Design", team: "Product Design", manager: "Chloe Martin", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 22, status: "active", salary: 84000, equityOptions: 9000 },
  { name: "Andre Silva", title: "Product Designer", department: "Design", team: "Product Design", manager: "Chloe Martin", location: "Lisbon", employmentType: "full-time", tenureMonths: 11, status: "active", salary: 72000, equityOptions: 5000 },
  { name: "Mei Tanaka", title: "Design Systems Designer", department: "Design", team: "Product Design", manager: "Chloe Martin", location: "Remote (EU)", employmentType: "contractor", tenureMonths: 4, status: "active", salary: 78000, equityOptions: 0 },

  // Sales
  { name: "Patrick O'Neill", title: "Enterprise Account Executive", department: "Sales", team: "Enterprise", manager: "Tomas Novak", location: "London", employmentType: "full-time", tenureMonths: 30, status: "active", salary: 92000, equityOptions: 12000 },
  { name: "Nina Kovac", title: "Enterprise Account Executive", department: "Sales", team: "Enterprise", manager: "Tomas Novak", location: "Berlin", employmentType: "full-time", tenureMonths: 20, status: "active", salary: 88000, equityOptions: 8000 },
  { name: "Gabriel Moretti", title: "Account Executive", department: "Sales", team: "Mid-Market", manager: "Tomas Novak", location: "Berlin", employmentType: "full-time", tenureMonths: 14, status: "active", salary: 74000, equityOptions: 5000 },
  { name: "Sofia Ramirez", title: "Account Executive", department: "Sales", team: "Mid-Market", manager: "Tomas Novak", location: "New York", employmentType: "full-time", tenureMonths: 8, status: "active", salary: 86000, equityOptions: 5000 },
  { name: "Amara Diallo", title: "Sales Development Rep", department: "Sales", team: "Mid-Market", manager: "Tomas Novak", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 3, status: "active", salary: 50000, equityOptions: 2000 },
  { name: "Lucas Pereira", title: "Solutions Engineer", department: "Sales", team: "Enterprise", manager: "Tomas Novak", location: "Lisbon", employmentType: "full-time", tenureMonths: 17, status: "active", salary: 84000, equityOptions: 7000 },
  { name: "Freya Andersen", title: "Customer Success Manager", department: "Sales", team: "Customer Success", manager: "Tomas Novak", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 13, status: "active", salary: 68000, equityOptions: 5000 },
  { name: "Marta Kowalski", title: "Customer Success Manager", department: "Sales", team: "Customer Success", manager: "Tomas Novak", location: "Berlin", employmentType: "full-time", tenureMonths: 7, status: "notice-period", salary: 66000, equityOptions: 3000, note: "Resigned — joining a competitor, garden leave agreed", endMonths: -1 },

  // Marketing
  { name: "Beatriz Lopes", title: "Content Lead", department: "Marketing", team: "Growth", manager: "Yusuf Demir", location: "Lisbon", employmentType: "full-time", tenureMonths: 19, status: "active", salary: 68000, equityOptions: 6000 },
  { name: "Tom Whitfield", title: "Performance Marketing Manager", department: "Marketing", team: "Growth", manager: "Yusuf Demir", location: "London", employmentType: "full-time", tenureMonths: 12, status: "active", salary: 72000, equityOptions: 4000 },
  { name: "Alina Popescu", title: "Product Marketing Manager", department: "Marketing", team: "Growth", manager: "Yusuf Demir", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 10, status: "active", salary: 70000, equityOptions: 4000 },
  { name: "Nils Berger", title: "Marketing Designer", department: "Marketing", team: "Growth", manager: "Yusuf Demir", location: "Berlin", employmentType: "part-time", tenureMonths: 5, status: "active", salary: 38000, equityOptions: 1500 },

  // Operations
  { name: "Ines Carvalho", title: "Compliance Manager", department: "Operations", team: "Risk & Compliance", manager: "Sofia Almeida", location: "Lisbon", employmentType: "full-time", tenureMonths: 23, status: "active", salary: 82000, equityOptions: 8000 },
  { name: "Jasper de Vries", title: "Risk Analyst", department: "Operations", team: "Risk & Compliance", manager: "Ines Carvalho", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 9, status: "active", salary: 62000, equityOptions: 3000 },
  { name: "Zara Ahmed", title: "Support Lead", department: "Operations", team: "Support", manager: "Sofia Almeida", location: "London", employmentType: "full-time", tenureMonths: 16, status: "active", salary: 64000, equityOptions: 4000 },
  { name: "Miguel Santos", title: "Support Specialist", department: "Operations", team: "Support", manager: "Zara Ahmed", location: "Lisbon", employmentType: "full-time", tenureMonths: 4, status: "active", salary: 42000, equityOptions: 1500 },

  // People
  { name: "Clara Vogel", title: "Talent Partner", department: "People", team: "Talent", manager: "Ana Sousa", location: "Berlin", employmentType: "full-time", tenureMonths: 18, status: "active", salary: 68000, equityOptions: 5000 },
  { name: "Ravi Shah", title: "People Operations Specialist", department: "People", team: "People Ops", manager: "Ana Sousa", location: "Remote (EU)", employmentType: "full-time", tenureMonths: 11, status: "active", salary: 58000, equityOptions: 3000 },
  { name: "Lucie Bernard", title: "People Ops Intern", department: "People", team: "People Ops", manager: "Ravi Shah", location: "Lisbon", employmentType: "intern", tenureMonths: 2, status: "active", salary: 18000, equityOptions: 0 },

  // Finance
  { name: "Henrique Matos", title: "Financial Controller", department: "Finance", team: "Accounting", manager: "Jonas Weber", location: "Lisbon", employmentType: "full-time", tenureMonths: 21, status: "active", salary: 86000, equityOptions: 7000 },
  { name: "Olivia Grant", title: "FP&A Analyst", department: "Finance", team: "FP&A", manager: "Jonas Weber", location: "London", employmentType: "full-time", tenureMonths: 13, status: "active", salary: 74000, equityOptions: 4000 },
  { name: "Bartosz Zielinski", title: "Accountant", department: "Finance", team: "Accounting", manager: "Henrique Matos", location: "Remote (EU)", employmentType: "contractor", tenureMonths: 15, status: "active", salary: 60000, equityOptions: 0 },
  { name: "Maria Ferreira", title: "Payroll Specialist", department: "Finance", team: "Accounting", manager: "Henrique Matos", location: "Lisbon", employmentType: "full-time", tenureMonths: 6, status: "active", salary: 52000, equityOptions: 2000 },

  // Alumni — kept for reporting and audit history
  { name: "Victor Almeida", title: "Backend Engineer", department: "Engineering", team: "Platform", manager: "Hana Kim", location: "Lisbon", employmentType: "full-time", tenureMonths: 34, status: "departed", salary: 88000, equityOptions: 9000, note: "Left to found a startup", endMonths: 5 },
  { name: "Grace Mbeki", title: "Account Executive", department: "Sales", team: "Mid-Market", manager: "Tomas Novak", location: "London", employmentType: "full-time", tenureMonths: 27, status: "departed", salary: 78000, equityOptions: 6000, note: "End of fixed-term contract", endMonths: 9 },
];
