export function SkeletonRow({ height = 38 }) {
    return <div className="skeleton" style={{ height, width: '100%' }} />;
}
export function SkeletonCard() {
    return (
        <div className="card p-4 space-y-3">
            <div className="skeleton"
                style={{ height: 16, width: '50%' }}
            />
            <div className="skeleton"
                style={{ height: 10, width: '80%' }}
            />
            <div className="skeleton"
                style={{ height: 10, width: '60%' }}
            />
        </div>
    );
}
