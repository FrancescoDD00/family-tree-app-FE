export interface PersonTreeNode {
    id: number;
    name: string;
    surname: string;
    father?: PersonTreeNode;
    mother?: PersonTreeNode;
    children?: PersonTreeNode[];
}
