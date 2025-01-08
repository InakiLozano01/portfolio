import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => navigateToNext(),
  onSwipedRight: () => navigateToPrevious(),
});

<nav {...handlers} className="navigation-bar">
  {/* Navigation items */}
</nav> 