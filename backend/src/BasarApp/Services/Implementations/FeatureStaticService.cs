using BasarApp.Dtos;
using BasarApp.Helpers;
using BasarApp.Models;
using BasarApp.Resources;
using NetTopologySuite.Geometries;
/*
namespace BasarApp.Services
{
    public class FeatureStaticService : IFeatureService
    {
        private static readonly List<(int Id, FeatureDto Data)> _features = new();
        private static int _idCounter = 1;

        public Task<ApiResponse<FeatureDto>> AddAsync(FeatureDto dto)
        {
            var validation = GeomValidationHelper.ValidateFeatureDto(dto);
            if (!validation.Success)
                return Task.FromResult(ApiResponse<FeatureDto>.FailResponse(validation.Message));

            var newItem = (Id: _idCounter++, Data: dto);
            _features.Add(newItem);

            return Task.FromResult(ApiResponse<FeatureDto>.SuccessResponse(dto, Messages.SuccessAdded));
        }

        public async Task<ApiResponse<List<FeatureDto>>> AddRangeAsync(List<FeatureDto> dtoList)
        {
            if (dtoList == null || dtoList.Count == 0)
                return ApiResponse<List<FeatureDto>>.FailResponse(Messages.Error.InvalidData);

            var addedItems = new List<FeatureDto>();
            var errors = new List<BatchError>();

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await using var tx = await conn.BeginTransactionAsync();

                for (int i = 0; i < dtoList.Count; i++)
                {
                    var dto = dtoList[i];

                    var validation = FeatureDtoValidator.ValidateFeatureDto(dto);
                    if (!validation.Success)
                    {
                        errors.Add(new BatchError(i + 1, nameof(FeatureDto.Geom), validation.Message));
                        continue;
                    }

                    // SRID boş geldiyse 4326 set etmek istersen:
                    if (dto.Geom != null && dto.Geom.SRID == 0) dto.Geom.SRID = 4326;

                    const string sql = "INSERT INTO features (name, \"Geometry\") VALUES (@name, @geom);";
                    await using var cmd = new NpgsqlCommand(sql, conn, tx);
                    cmd.Parameters.AddWithValue("name", dto.Name ?? string.Empty);
                    cmd.Parameters.AddWithValue("geom", dto.Geom);

                    await cmd.ExecuteNonQueryAsync();
                    addedItems.Add(dto);
                }

                if (errors.Count > 0)
                {
                    await tx.RollbackAsync();
                    return ApiResponse<List<FeatureDto>>.FailResponse(Messages.BatchErrorsOccurred, errors);
                }

                await tx.CommitAsync();
                return ApiResponse<List<FeatureDto>>.SuccessResponse(addedItems, Messages.SuccessAdded);
            }
            catch (Exception ex)
            {
                return ApiResponse<List<FeatureDto>>.FailResponse($"{Messages.UnexpectedError} {ex.Message}");
            }
        }


        public Task<ApiResponse<List<FeatureDto>>> AddRangeAsync(List<FeatureDto> dtos)
        {
            var addedItems = new List<FeatureDto>();

            foreach (var dto in dtos)
            {
                var validation = GeomValidationHelper.ValidateFeatureDto(dto);
                if (!validation.Success)
                    return Task.FromResult(ApiResponse<List<FeatureDto>>.FailResponse(validation.Message));

                var newItem = (Id: _idCounter++, Data: dto);
                _features.Add(newItem);
                addedItems.Add(dto);
            }

            return Task.FromResult(ApiResponse<List<FeatureDto>>.SuccessResponse(addedItems, Messages.SuccessAdded));
        }

        public Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            var item = _features.FirstOrDefault(f => f.Id == id);
            if (item.Equals(default))
                return Task.FromResult(ApiResponse<bool>.FailResponse(Messages.ErrorNotFound));

            _features.Remove(item);
            return Task.FromResult(ApiResponse<bool>.SuccessResponse(true, Messages.Success.Deleted));
        }

        public Task<ApiResponse<List<FeatureDto>>> GetAllAsync()
        {
            var list = _features.Select(f => f.Data).ToList();
            return Task.FromResult(ApiResponse<List<FeatureDto>>.SuccessResponse(list, Messages.SuccessListed));
        }

        public Task<ApiResponse<FeatureDto>> GetByIdAsync(int id)
        {
            var item = _features.FirstOrDefault(f => f.Id == id);
            if (item.Equals(default))
                return Task.FromResult(ApiResponse<FeatureDto>.FailResponse(Messages.ErrorNotFound));

            return Task.FromResult(ApiResponse<FeatureDto>.SuccessResponse(item.Data, Messages.SuccessFound));
        }

        public Task<ApiResponse<FeatureDto>> UpdateAsync(int id, FeatureDto dto)
        {
            var validation = GeomValidationHelper.ValidateFeatureDto(dto);
            if (!validation.Success)
                return Task.FromResult(ApiResponse<FeatureDto>.FailResponse(validation.Message));

            var index = _features.FindIndex(f => f.Id == id);
            if (index == -1)
                return Task.FromResult(ApiResponse<FeatureDto>.FailResponse(Messages.ErrorNotFound));

            _features[index] = (id, dto);

            return Task.FromResult(ApiResponse<FeatureDto>.SuccessResponse(dto, Messages.SuccessUpdated));
        }
    }
}


*/