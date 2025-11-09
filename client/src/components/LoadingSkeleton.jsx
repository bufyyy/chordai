/**
 * Loading Skeleton components
 * Used for better loading UX
 */

export function CardSkeleton() {
  return (
    <div className="glass rounded-xl p-6 animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-2/3"></div>
    </div>
  );
}

export function ChordSkeleton() {
  return (
    <div className="inline-block px-8 py-6 bg-gray-700/30 rounded-xl animate-pulse">
      <div className="h-8 w-16 bg-gray-600 rounded"></div>
    </div>
  );
}

export function ProgressionSkeleton() {
  return (
    <div className="glass rounded-xl p-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-1/3 mb-6"></div>
      <div className="flex flex-wrap gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <ChordSkeleton key={i} />
        ))}
      </div>
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 bg-gray-700 rounded w-12"></div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="glass rounded-xl p-6 space-y-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-700 rounded w-full"></div>
        </div>
      ))}
      <div className="h-12 bg-gradient-to-r from-blue-600/50 to-purple-600/50 rounded-lg w-full"></div>
    </div>
  );
}

export function PlayerSkeleton() {
  return (
    <div className="glass rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-700 rounded w-1/3"></div>
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-10 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="glass-darker rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export default {
  CardSkeleton,
  ChordSkeleton,
  ProgressionSkeleton,
  FormSkeleton,
  PlayerSkeleton,
  ListSkeleton,
};
