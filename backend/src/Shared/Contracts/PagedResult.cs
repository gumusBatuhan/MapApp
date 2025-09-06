namespace BasarApp.Shared.Contracts
{
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }

        public int TotalPages => (int)Math.Ceiling((double)TotalCount / Math.Max(1, PageSize));
        public bool HasNext => Page < TotalPages;
        public bool HasPrev => Page > 1;
    }
}
