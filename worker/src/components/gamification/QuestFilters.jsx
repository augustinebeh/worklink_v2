import { FilterTabs } from '../common';

export default function QuestFilters({ filter, onFilterChange, quests }) {
  const activeCount = quests.filter(q => q.status !== 'claimed').length;
  const completedCount = quests.filter(q => q.status === 'claimed').length;

  return (
    <FilterTabs
      tabs={[
        { id: 'all', label: 'All', count: quests.length },
        { id: 'active', label: 'Active', count: activeCount },
        { id: 'completed', label: 'Completed', count: completedCount },
      ]}
      activeFilter={filter}
      onFilterChange={onFilterChange}
      variant="violet"
    />
  );
}
