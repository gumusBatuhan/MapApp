namespace BasarApp.Shared.Contracts
{
    public class BatchError
    {
        public int Row { get; init; } // init sayesinde nesne oluşturulduktan sonra değerler değiştirilemez.
        public string Field { get; init; }
        public string Message { get; init; }

        public BatchError(int row, string field, string message)
        {
            Row = row;
            Field = field;
            Message = message;
        }
    }
}
