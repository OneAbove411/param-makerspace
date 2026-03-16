export interface ProjectReaction { likes: number; upvotes: number; bookmarks: number; }
export interface VideoLink { id: string; title: string; url: string; }

export interface Project {
    id: string; title: string; summary: string; description: string; domain: string; tier: string;
    tags: string[]; makerName: string; coverImage: string; gallery: string[]; videoLinks: VideoLink[];
    github: string; duration: string; status: string; visibility: string; reactions: ProjectReaction;
}

export interface Challenge {
    id: string; title: string; tier: string; domain: string; tags: string[]; timeEstimate: string; coverImage: string;
    gallery: string[]; videoLinks: VideoLink[]; mystery: string; coreIdea: string; mission: string; steps: string[];
    materials: string[]; skills: string[]; vocabulary: string[]; levels: string; successCriteria: string;
    reactions: ProjectReaction;
}

export interface Event {
    id: string; title: string; date: string; location: string; type: string;
    registrationStatus: string; capacityRemaining: number; coverImage: string;
    description: string; gallery: string[]; videoLinks: VideoLink[]; capacity: number;
}

export interface Maker {
    id: string; name: string; avatar: string; bio: string; aspirations: string;
    github: string; linkedin: string; skills: string[]; badges: string[]; tags: string[];
}

export interface Badge {
    id: string; name: string; description: string; tier: string; domain: string; type: string; criteria: string; image: string;
}

export interface Product {
    id: string; name: string; description: string; price: number; category: string; image: string; requiredBadgeId: string | null;
}

export const MOCK_PROJECTS: Project[] = [
    {
        id: 'prj_1',
        title: 'Autonomous Drone Nav',
        summary: 'A computer vision pipeline for indoor drone navigation avoiding obstacles in real-time.',
        description: 'This project implements a lightweight monocular depth estimation model on a Raspberry Pi 4 to allow a custom quadcopter to navigate indoor environments without GPS or lidar.',
        domain: 'Software & Robotics',
        tier: 'Tier 3',
        tags: ['Python', 'OpenCV', 'ROS', 'Hardware'],
        makerName: 'Alice Chen',
        coverImage: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=2080&auto=format&fit=crop',
        gallery: [],
        videoLinks: [],
        github: 'https://github.com/example/drone-nav',
        duration: '12 weeks',
        status: 'active',
        visibility: 'public',
        reactions: { likes: 142, upvotes: 89, bookmarks: 24 }
    }
];

export const MOCK_CHALLENGES: Challenge[] = [
    {
        id: 'ch_1',
        title: 'The Unsolvable Cube',
        tier: 'Tier 2',
        domain: 'Fabrication',
        tags: ['3D Printing', 'Puzzle'],
        timeEstimate: '4 hours',
        coverImage: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=2070&auto=format&fit=crop',
        gallery: [],
        videoLinks: [],
        mystery: 'Can a cube have intersecting internal pathways that only allow a metallic sphere to pass if rotated correctly?',
        coreIdea: 'Parametric internal voids and multi-part interlocking assemblies.',
        mission: 'Design, slice, and print a 3D puzzle cube that requires a non-trivial sequence of movements to solve.',
        steps: ['Prototype', 'Test', 'Design', 'Print'],
        materials: ['PLA Filament', 'Steel Bearing'],
        skills: ['CAD Design', '3D Slicing'],
        vocabulary: ['Parametric', 'Overhang'],
        levels: 'Beginner Fabrication',
        successCriteria: 'Sphere can navigate from entry to exit.',
        reactions: { likes: 42, upvotes: 18, bookmarks: 9 }
    }
];

export const MOCK_EVENTS: Event[] = [
    {
        id: 'ev_1',
        title: 'Hackathon: Future Spaces',
        date: '2026-04-10T09:00:00Z',
        location: 'Main Hall',
        type: 'build_challenge',
        registrationStatus: 'open',
        capacityRemaining: 45,
        capacity: 100,
        coverImage: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2012&auto=format&fit=crop',
        description: 'A hardware build challenge focused on IoT and embedded systems.',
        gallery: [],
        videoLinks: []
    }
];

export const MOCK_MAKERS: Maker[] = [
    {
        id: 'usr_1',
        name: 'Alice Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop',
        bio: 'Robotics engineer specializing in autonomous navigation and embedded systems.',
        aspirations: 'To build a fully autonomous search and rescue drone fleet.',
        github: 'https://github.com/alice',
        linkedin: 'https://linkedin.com/in/alice',
        skills: ['Python', 'C++', 'ROS', 'PCB Design'],
        badges: ['bdg_1', 'bdg_2'],
        tags: ['Robotics', 'Tier 3', 'Hardware']
    }
];

export const MOCK_BADGES: Badge[] = [
    {
        id: 'bdg_1',
        name: 'Lab Safety Certified',
        description: 'Passed the general lab safety induction.',
        tier: 'Tier 1',
        domain: 'General',
        type: 'Induction',
        criteria: 'Attend the 1-hour safety briefing and pass the quiz.',
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=2070&auto=format&fit=crop'
    },
    {
        id: 'bdg_2',
        name: 'Advanced CNC Operations',
        description: 'Certified to operate the 5-axis CNC router independently.',
        tier: 'Tier 3',
        domain: 'Fabrication',
        type: 'Equipment',
        criteria: 'Complete the 3-day workshop and successfully mill a test piece.',
        image: 'https://images.unsplash.com/photo-1612803867614-7eb356a735c0?q=80&w=1974&auto=format&fit=crop'
    }
];

export const MOCK_STORE: Product[] = [
    {
        id: 'prod_1',
        name: 'PLA Filament Spool - 1KG',
        description: 'High quality 1.75mm PLA filament. Available in various colors at the lab.',
        price: 24.99,
        category: 'Materials',
        image: 'https://images.unsplash.com/photo-1631541909061-71e349d1f203?q=80&w=1974&auto=format&fit=crop',
        requiredBadgeId: null
    },
    {
        id: 'prod_2',
        name: 'CNC End Mill Kit',
        description: 'Professional grade carbide end mills for the 5-axis router.',
        price: 145.00,
        category: 'Tools',
        image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=2140&auto=format&fit=crop',
        requiredBadgeId: 'bdg_2'
    }
];
