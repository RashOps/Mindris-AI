import { create } from 'zustand';

// Basic typing for our CV data based on the backend schema
export interface Experience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  description: string;
  achievements: string[];
}

export interface SkillCategory {
  id: string;
  category: string;
  items: string[];
}

export interface CVData {
  profile_name: string;
  profile_title: string;
  profile_summary: string;
  experience: Experience[];
  skills: SkillCategory[];
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    start_date: string;
    end_date: string;
  }>;
}

interface CVStore {
  cvData: CVData;
  isOptimizing: boolean;
  setCVData: (data: Partial<CVData>) => void;
  updateExperience: (id: string, data: Partial<Experience>) => void;
  reorderExperience: (startIndex: number, endIndex: number) => void;
  setIsOptimizing: (status: boolean) => void;
}

// Initial dummy data for the editor
const initialCV: CVData = {
  profile_name: "John Doe",
  profile_title: "Senior Software Engineer",
  profile_summary: "Passionate engineer with 10 years of experience building scalable applications.",
  experience: [
    {
      id: "exp-1",
      title: "Lead Developer",
      company: "Tech Corp",
      start_date: "2020",
      end_date: "Present",
      description: "Led the migration to microservices.",
      achievements: ["Increased performance by 40%", "Reduced costs by 20%"]
    },
    {
      id: "exp-2",
      title: "Fullstack Engineer",
      company: "Startup Inc",
      start_date: "2018",
      end_date: "2020",
      description: "Built the core platform from scratch.",
      achievements: ["Shipped MVP in 3 months"]
    }
  ],
  skills: [
    { id: "sk-1", category: "Languages", items: ["TypeScript", "Python", "Go"] },
    { id: "sk-2", category: "Frameworks", items: ["Next.js", "FastAPI", "React"] }
  ],
  education: [
    { id: "ed-1", degree: "BSc Computer Science", institution: "University of Tech", start_date: "2014", end_date: "2018" }
  ]
};

export const useCVStore = create<CVStore>((set) => ({
  cvData: initialCV,
  isOptimizing: false,
  
  setCVData: (data) => set((state) => ({ 
    cvData: { ...state.cvData, ...data } 
  })),
  
  updateExperience: (id, data) => set((state) => ({
    cvData: {
      ...state.cvData,
      experience: state.cvData.experience.map(exp => 
        exp.id === id ? { ...exp, ...data } : exp
      )
    }
  })),
  
  reorderExperience: (startIndex, endIndex) => set((state) => {
    const newExp = [...state.cvData.experience];
    const [removed] = newExp.splice(startIndex, 1);
    newExp.splice(endIndex, 0, removed);
    return {
      cvData: { ...state.cvData, experience: newExp }
    };
  }),

  setIsOptimizing: (status) => set({ isOptimizing: status })
}));
