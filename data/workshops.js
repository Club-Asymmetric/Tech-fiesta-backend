// Tech Fiesta 2025 Workshops
const workshops = [
  {
    id: 1,
    title: "Blend with Blender",
    category: "3D Design",
    level: "Beginner",
    duration: "1 - 1.5 hours",
    date: "2025-03-23",
    time: "9:00 AM - 3:00 PM",
    venue: "3D Design Studio",
    instructor: "3D Artist & Blender Expert",
    description:
      "Master 3D modeling with Blender! Learn interface navigation, essential tools, create and render 3D models, and integrate them into web experiences.",
    prerequisites: ["Basic computer knowledge", "Interest in 3D design"],
    materials: ["Laptop", "Blender installed", "Mouse recommended"],
    capacity: 60,
    registrations: 0,
    price: "₹101",
    citPrice: "₹50",
    tags: ["Blender", "3D Modeling", "Web Integration", "Visualization"],
    syllabus: [
      "Introduction to 3D modeling concepts using Blender",
      "Navigating Blender's interface and mastering essential tools",
      "Creating and rendering simple 3D models",
      "Tips for effective 3D visualization and presentation",
      "Applying Blender for interactive web experiences",
      "Best practices for integrating 3D models into websites",
      "Showcasing real-world examples of Blender-powered web content",
    ],
  },
  {
    id: 2,
    title: "Product Cyber Security",
    category: "Cybersecurity",
    level: "Intermediate",
    duration: "1 - 1.5 hours",
    date: "2025-03-24",
    time: "10:00 AM - 3:00 PM",
    venue: "Automotive Security Lab",
    instructor: "Automotive Security Specialist",
    description:
      "Explore cybersecurity challenges in automotive OEMs. Learn to safeguard vehicle systems, secure communication protocols, and ensure software integrity.",
    prerequisites: [
      "Basic cybersecurity knowledge",
      "Understanding of automotive systems",
    ],
    materials: ["Laptop", "Security tools access", "Case study materials"],
    capacity: 60,
    registrations: 0,
    price: "₹101",
    citPrice: "₹50",
    tags: ["Automotive Security", "OEM", "Vehicle Systems", "Cyber Threats"],
    syllabus: [
      "Understanding cybersecurity challenges in automotive OEMs",
      "Safeguarding vehicle systems and data from cyber threats",
      "Ensuring secure communication and software integrity",
      "Automotive security standards and compliance",
      "Threat modeling for connected vehicles",
      "Security testing methodologies for automotive systems",
    ],
  },
  {
    id: 3,
    title: "Machine Learning Workshop",
    category: "AI/ML",
    level: "Intermediate",
    duration: "1 - 1.5 hours",
    date: "2025-03-25",
    time: "9:00 AM - 4:00 PM",
    venue: "AI/ML Lab",
    instructor: "Machine Learning Engineer",
    description:
      "Comprehensive ML workshop covering key algorithms, model training, evaluation, and local fine-tuning. Hands-on experience with real-world applications.",
    prerequisites: ["Python programming", "Basic statistics knowledge"],
    materials: ["Laptop", "Python environment", "Jupyter notebooks"],
    capacity: 60,
    registrations: 0,
    price: "₹101",
    citPrice: "₹50",
    tags: ["Machine Learning", "Model Training", "Python", "Algorithms"],
    syllabus: [
      "Overview of key machine learning algorithms",
      "How machine learning works: model training and evaluation",
      "Introduction to local model training and fine-tuning for specific tasks",
      "Practical examples and tips for real-world machine learning applications",
      "Model deployment and monitoring",
      "Ethics and bias in machine learning",
    ],
  },
  {
    id: 4,
    title: "App/Web Development",
    category: "Web Development",
    level: "Beginner",
    duration: "1 - 1.5 hours",
    date: "2025-03-26",
    time: "9:00 AM - 5:00 PM",
    venue: "Web Development Lab",
    instructor: "Full Stack Developer",
    description:
      "Build scalable, responsive web applications using modern frameworks. Learn core principles, UI design, performance optimization, and deployment best practices.",
    prerequisites: ["Basic HTML/CSS knowledge", "Programming fundamentals"],
    materials: ["Laptop", "Code editor", "Modern web browser"],
    capacity: 60,
    registrations: 0,
    price: "₹101",
    citPrice: "₹50",
    tags: [
      "Web Development",
      "Responsive Design",
      "Modern Frameworks",
      "Deployment",
    ],
    syllabus: [
      "Building scalable and responsive web applications",
      "Core principles of app and web development using modern frameworks",
      "Hands-on guidance for designing user-friendly interfaces",
      "Performance optimization techniques",
      "Best practices for deploying and maintaining robust web solutions",
      "Testing and debugging web applications",
    ],
  },
  {
    id: 5,
    title: "Cloud/DevSecOps",
    category: "DevOps",
    level: "Advanced",
    duration: "1 - 1.5 hours",
    date: "2025-03-27",
    time: "10:00 AM - 4:00 PM",
    venue: "Cloud Computing Lab",
    instructor: "DevSecOps Engineer",
    description:
      "Master cloud computing and DevSecOps practices. Hands-on experience with cloud platforms, security integration, and automated deployment pipelines.",
    prerequisites: [
      "Linux knowledge",
      "Basic cloud concepts",
      "Development experience",
    ],
    materials: ["Laptop", "Cloud platform access", "Terminal/CLI tools"],
    capacity: 60,
    registrations: 0,
    price: "₹101",
    citPrice: "₹50",
    tags: ["Cloud Computing", "DevSecOps", "Security", "Automation"],
    syllabus: [
      "Introduction to cloud computing concepts",
      "Hands-on experience with cloud platforms (AWS/Azure/GCP)",
      "Overview of DevSecOps pipelines and architecture",
      "Integrating security into the development and deployment lifecycle",
      "Infrastructure as Code (IaC) principles",
      "Monitoring and logging in cloud environments",
      "Container orchestration and microservices security",
    ],
  },
];

// Helper functions
const getWorkshopsByCategory = (category) =>
  workshops.filter((workshop) => workshop.category === category);

const getWorkshopsByLevel = (level) =>
  workshops.filter((workshop) => workshop.level === level);

const getWorkshopById = (id) =>
  workshops.find((workshop) => workshop.id === id);

const getAvailableWorkshops = () =>
  workshops.filter(
    (workshop) => (workshop?.registrations ?? 0) < (workshop.capacity ?? 0)
  );

const getWorkshopCategories = () => [
  ...new Set(workshops.map((workshop) => workshop.category)),
];

const getWorkshopLevels = () =>
  [...new Set(workshops.map((workshop) => workshop.level))].filter(
    (level) => level !== undefined
  );

module.exports = {
  workshops,
  getWorkshopsByCategory,
  getWorkshopsByLevel,
  getWorkshopById,
  getAvailableWorkshops,
  getWorkshopCategories,
  getWorkshopLevels,
};
