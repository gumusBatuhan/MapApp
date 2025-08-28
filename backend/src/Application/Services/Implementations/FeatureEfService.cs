using BasarApp.Application.Dtos;
using BasarApp.Domain.Entities;
using BasarApp.Shared.Contracts;
using BasarApp.Application.Abstractions;
using BasarApp.Shared.Resources;
using BasarApp.Application.Validators;
using Microsoft.Extensions.DependencyInjection;

namespace BasarApp.Application.Services.Implementations
{
    /// <summary>
    /// EF Core tabanlı IFeatureService implementasyonu.
    /// Aynı DTO, Validator, ApiResponse, Messages, BatchError kullanır.
    /// UoW: EfUnitOfWork
    /// </summary>
    public class FeatureEfService : IFeatureService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly FeatureDtoValidator _validator;

        public FeatureEfService([FromKeyedServices("ef")] IUnitOfWork unitOfWork, FeatureDtoValidator validator)
        {
            _unitOfWork = unitOfWork;
            _validator = validator;
        }

        public async Task<ApiResponse<FeatureDto>> GetByIdAsync(int id, CancellationToken ct)
        {
            var entity = await _unitOfWork.FeatureRepository.GetByIdAsync(id, ct);
            if (entity == null)
                return ApiResponse<FeatureDto>.FailResponse(Messages.Error.NotFound);

            var dto = new FeatureDto { Name = entity.Name, Geom = entity.Geom };
            return ApiResponse<FeatureDto>.SuccessResponse(dto, Messages.Success.Found);
        }

        public async Task<ApiResponse<List<FeatureDto>>> GetAllAsync(CancellationToken ct)
        {
            var entities = await _unitOfWork.FeatureRepository.GetAllAsync(ct);
            var dtos = entities.Select(e => new FeatureDto { Name = e.Name, Geom = e.Geom }).ToList();
            return ApiResponse<List<FeatureDto>>.SuccessResponse(dtos, Messages.Success.AllListed);
        }

        public async Task<ApiResponse<FeatureDto>> AddAsync(FeatureDto dto, CancellationToken ct)
        {
            var validation = await _validator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
                return ApiResponse<FeatureDto>.FailResponse(validation.Errors.First().ErrorMessage);

            var entity = new Feature { Name = dto.Name, Geom = dto.Geom };

            try
            {
                await _unitOfWork.BeginTransactionAsync(ct);
                await _unitOfWork.FeatureRepository.AddAsync(entity, ct);
                await _unitOfWork.CommitAsync(ct);
                return ApiResponse<FeatureDto>.SuccessResponse(dto, Messages.Success.Added);
            }
            catch (Exception ex)
            {
                await _unitOfWork.RollbackAsync(ct);
                return ApiResponse<FeatureDto>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }

        public async Task<ApiResponse<List<FeatureDto>>> AddRangeAsync(List<FeatureDto> dtoList, CancellationToken ct)
        {
            if (dtoList == null || dtoList.Count == 0)
                return ApiResponse<List<FeatureDto>>.FailResponse(Messages.Error.InvalidData);

            var entities = new List<Feature>();
            var errors = new List<BatchError>();

            for (int i = 0; i < dtoList.Count; i++)
            {
                ct.ThrowIfCancellationRequested();

                var dto = dtoList[i];
                var validation = await _validator.ValidateAsync(dto, ct);
                if (!validation.IsValid)
                {
                    errors.Add(new BatchError(i + 1, "Geom/Name", validation.Errors.First().ErrorMessage));
                    continue;
                }
                entities.Add(new Feature { Name = dto.Name, Geom = dto.Geom });
            }

            if (errors.Count > 0)
                return ApiResponse<List<FeatureDto>>.FailResponse(Messages.Error.BatchErrorsOccurred, errors);

            try
            {
                await _unitOfWork.BeginTransactionAsync(ct);
                await _unitOfWork.FeatureRepository.AddRangeAsync(entities, ct);
                await _unitOfWork.CommitAsync(ct);
                return ApiResponse<List<FeatureDto>>.SuccessResponse(dtoList, Messages.Success.Added);
            }
            catch (Exception ex)
            {
                await _unitOfWork.RollbackAsync(ct);
                return ApiResponse<List<FeatureDto>>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }

        public async Task<ApiResponse<FeatureDto>> UpdateAsync(int id, FeatureDto dto, CancellationToken ct)
        {
            var validation = await _validator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
                return ApiResponse<FeatureDto>.FailResponse(validation.Errors.First().ErrorMessage);

            var exists = await _unitOfWork.FeatureRepository.ExistsAsync(id, ct);
            if (!exists)
                return ApiResponse<FeatureDto>.FailResponse(Messages.Error.NotFound);

            var entity = new Feature { Id = id, Name = dto.Name, Geom = dto.Geom };

            try
            {
                await _unitOfWork.BeginTransactionAsync(ct);
                await _unitOfWork.FeatureRepository.UpdateAsync(entity, ct);
                await _unitOfWork.CommitAsync(ct);
                return ApiResponse<FeatureDto>.SuccessResponse(dto, Messages.Success.Updated);
            }
            catch (Exception ex)
            {
                await _unitOfWork.RollbackAsync(ct);
                return ApiResponse<FeatureDto>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }

        public async Task<ApiResponse<bool>> DeleteAsync(int id, CancellationToken ct)
        {
            var exists = await _unitOfWork.FeatureRepository.ExistsAsync(id, ct);
            if (!exists)
                return ApiResponse<bool>.FailResponse(Messages.Error.NotFound);

            try
            {
                await _unitOfWork.BeginTransactionAsync(ct);
                await _unitOfWork.FeatureRepository.DeleteAsync(id, ct);
                await _unitOfWork.CommitAsync(ct);
                return ApiResponse<bool>.SuccessResponse(true, Messages.Success.Deleted);
            }
            catch (Exception ex)
            {
                await _unitOfWork.RollbackAsync(ct);
                return ApiResponse<bool>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }
    }
}
