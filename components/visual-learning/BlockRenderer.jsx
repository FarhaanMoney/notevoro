'use client';

import ConceptBlock from './blocks/ConceptBlock';
import StepsBlock from './blocks/StepsBlock';
import DiagramBlock from './blocks/DiagramBlock';
import FormulaBlock from './blocks/FormulaBlock';
import ComparisonBlock from './blocks/ComparisonBlock';
import ExampleBlock from './blocks/ExampleBlock';
import QuizBlock from './blocks/QuizBlock';
import MemoryBlock from './blocks/MemoryBlock';
import TakeawayBlock from './blocks/TakeawayBlock';

export default function BlockRenderer({ block }) {
  if (!block?.type) return null;

  switch (block.type) {
    case 'concept':
      return <ConceptBlock block={block} />;
    case 'steps':
      return <StepsBlock block={block} />;
    case 'diagram':
      return <DiagramBlock block={block} />;
    case 'formula':
      return <FormulaBlock block={block} />;
    case 'comparison':
      return <ComparisonBlock block={block} />;
    case 'example':
      return <ExampleBlock block={block} />;
    case 'quiz':
      return <QuizBlock block={block} />;
    case 'memory':
      return <MemoryBlock block={block} />;
    case 'takeaway':
      return <TakeawayBlock block={block} />;
    default:
      return null;
  }
}
