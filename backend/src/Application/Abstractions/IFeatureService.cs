using BasarApp.Application.Dtos;
using BasarApp.Models;

namespace BasarApp.Application.Abstractions
{
    public interface IFeatureService
    {
        Task<ApiResponse<FeatureDto>> GetByIdAsync(int id, CancellationToken ct);
        Task<ApiResponse<List<FeatureDto>>> GetAllAsync(CancellationToken ct);
        Task<ApiResponse<FeatureDto>> AddAsync(FeatureDto dto, CancellationToken ct);
        Task<ApiResponse<List<FeatureDto>>> AddRangeAsync(List<FeatureDto> dtoList, CancellationToken ct);
        Task<ApiResponse<FeatureDto>> UpdateAsync(int id, FeatureDto dto, CancellationToken ct);
        Task<ApiResponse<bool>> DeleteAsync(int id, CancellationToken ct);
    }

}