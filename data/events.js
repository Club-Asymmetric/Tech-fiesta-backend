// Tech Fiesta 2025 Events
const events = [
  // Technical Events
  {
    id: 1,
    title: "Try, If you can..?",
    type: "tech",
    date: "2025-07-30",
    time: "10:00 AM - 6:00 PM",
    venue: "Security Lab",
    description:
      "High-stakes challenge where teams analyze unique VM-Snapshots, identify vulnerabilities, and gain access. Demonstrate advanced system security, reverse engineering, and privilege escalation techniques.",
    speakers: ["Cybersecurity Experts", "Ethical Hackers"],
    capacity: 60,
    registrations: 0,
    tags: ["Security", "VM", "Reverse Engineering", "Signature Event"],
    image: "/images/try-if-you-can.jpg",
    price: "₹99",
    citPrice: "₹59",
  },
  {
    id: 2,
    title: "Reverse Code",
    type: "tech",
    date: "2025-07-30",
    time: "2:00 PM - 4:00 PM",
    venue: "Programming Lab",
    description:
      "Write code in reverse order! If the problem is to print 'hello world', you must code it backwards. A unique challenge that tests your programming logic and creativity.",
    speakers: ["Programming Mentors"],
    capacity: 60,
    registrations: 0,
    tags: ["Programming", "Logic", "Creative Coding"],
    image: "/images/reverse-code.jpg",
    price: "₹99",
    citPrice: "₹59",
  },
  {
    id: 3,
    title: "Escape Room",
    type: "tech",
    date: "2025-07-30",
    time: "11:00 AM - 5:00 PM",
    venue: "Interactive Lab",
    description:
      "Solve interconnected problems to progress through levels. Retrieve passwords using hints and answer security questions based on clues. A digital escape room experience!",
    speakers: ["Puzzle Masters", "Security Analysts"],
    capacity: 60,
    registrations: 0,
    tags: ["Problem Solving", "Security", "Puzzles"],
    image: "/images/escape-room.jpg",
    price: "₹99",
    citPrice: "₹59",
    maxTeamSize: 2,
  },
  {
    id: 4,
    title: "Prompt Engineering",
    type: "tech",
    date: "2025-07-30",
    time: "9:00 AM - 3:00 PM",
    venue: "AI Lab",
    description:
      "Complete tasks using AI tools within time limits. Create responsive web pages, generate images, write compelling stories - all through effective prompt engineering.",
    speakers: ["AI Specialists", "Prompt Engineers"],
    capacity: 60,
    registrations: 0,
    tags: ["AI", "Prompt Engineering", "Creative AI"],
    image: "/images/prompt-engineering.jpg",
    price: "₹99",
    citPrice: "₹59",
  },
  {
    id: 5,
    title: "Project Presentation",
    type: "tech",
    date: "2025-07-30",
    time: "10:00 AM - 4:00 PM",
    venue: "Main Auditorium",
    description:
      "Develop feasible solutions to given problems. Present innovative and practical approaches that effectively address requirements and demonstrate technical excellence.",
    speakers: ["Industry Experts", "Project Mentors"],
    capacity: 60,
    registrations: 0,
    tags: ["Presentation", "Innovation", "Problem Solving"],
    image: "/images/project-presentation.jpg",
    price: "₹99",
    citPrice: "₹59",
    maxTeamSize: 2,
  },
  {
    id: 6,
    title: "Capture The Flag (CTF)",
    type: "tech",
    date: "2025-07-30",
    time: "1:00 PM - 7:00 PM",
    venue: "CTF Arena",
    description:
      "Solve challenges using hints and flags from various domains including cryptography and web vulnerabilities. Compete in any order and showcase your diverse technical skills.",
    speakers: ["CTF Champions", "Security Researchers"],
    capacity: 60,
    registrations: 0,
    tags: ["CTF", "Cryptography", "Web Security", "Competition"],
    image: "/images/ctf.jpg",
    price: "₹99",
    citPrice: "₹59",
    maxTeamSize: 2,
  },
  // Non-Technical Events
  {
    id: 7,
    title: "Channel Surfing",
    type: "non-tech",
    date: "2025-07-30",
    time: "3:00 PM - 5:00 PM",
    venue: "Entertainment Hall",
    description:
      "Fast-paced improv game where teams act out scenes from random TV genres - news, drama, sports, etc. Switch roles on the spot with humor and creativity!",
    speakers: ["Improv Artists", "Entertainment Hosts"],
    capacity: 60,
    registrations: 0,
    tags: ["Improv", "Entertainment", "Creativity", "Team Building"],
    image: "/images/channel-surfing.jpg",
    price: "₹79",
    citPrice: "₹49",
  },
  {
    id: 8,
    title: "Spin A Yarn",
    type: "non-tech",
    date: "2025-07-30",
    time: "2:00 PM - 4:00 PM",
    venue: "Storytelling Corner",
    description:
      "Storytelling challenge where participants build creative, humorous stories using random prompts. Test your spontaneity, imagination, and public speaking skills!",
    speakers: ["Storytellers", "Creative Writers"],
    capacity: 60,
    registrations: 0,
    tags: ["Storytelling", "Creativity", "Public Speaking"],
    image: "/images/spin-a-yarn.jpg",
    price: "₹79",
    citPrice: "₹49",
  },
  {
    id: 9,
    title: "Photography Contest",
    type: "non-tech",
    date: "2025-07-30",
    time: "All Day",
    venue: "Throughout TechFiesta",
    description:
      "Capture the essence, excitement, and emotions of TechFiesta! Submit your best shots highlighting perspective, composition, and storytelling through the lens.",
    speakers: ["Professional Photographers", "Visual Artists"],
    capacity: 60,
    registrations: 0,
    tags: ["Photography", "Visual Arts", "Contest", "Documentation"],
    image: "/images/photography.jpg",
    price: "₹79",
    citPrice: "₹49",
  },
  {
    id: 10,
    title: "TechFiesta Quiz",
    type: "non-tech",
    date: "2025-07-30",
    time: "11:00 AM - 1:00 PM",
    venue: "Quiz Arena",
    description:
      "Test your knowledge about TechFiesta, CIT, and general trivia. A fun and engaging quiz that challenges your memory and quick thinking!",
    speakers: ["Quiz Masters", "Trivia Experts"],
    capacity: 60,
    registrations: 0,
    tags: ["Quiz", "Trivia", "Knowledge", "Fun"],
    image: "/images/quiz.jpg",
    price: "₹79",
    citPrice: "₹49",
  }
];

// Helper functions
const getTechEvents = () => events.filter((event) => event.type === "tech");
const getNonTechEvents = () =>
  events.filter((event) => event.type === "non-tech");
const getEventById = (id) => events.find((event) => event.id === id);
const getUpcomingEvents = () => {
  const today = new Date();
  return events.filter((event) => new Date(event.date) >= today);
};

module.exports = {
  events,
  getTechEvents,
  getNonTechEvents,
  getEventById,
  getUpcomingEvents,
};
