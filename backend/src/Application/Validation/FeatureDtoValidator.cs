using BasarApp.Application.Dtos;
using BasarApp.Shared.Contracts;
using BasarApp.Shared.Resources;
using FluentValidation;
using NetTopologySuite.Geometries;
using NetTopologySuite.Operation.Valid;

namespace BasarApp.Application.Validators
{
    /// <summary>
    /// FeatureDto için alan doğrulayıcı.
    /// Name ve Geom zorunlu; Geom yalnızca Point/LineString/Polygon olmalı ve topolojik olarak geçerli olmalı.
    /// Bağımlılıklar: FluentValidation, NTS (IsValidOp), Messages (hata metinleri).
    /// </summary>
    public class FeatureDtoValidator : AbstractValidator<FeatureDto>
    {
        public FeatureDtoValidator()
        {
            // Name zorunlu ve max 50
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage(Messages.Error.NameEmpty)
                .MaximumLength(50).WithMessage(Messages.Error.NameTooLong);

            // Geom: null/empty değil
            RuleFor(x => x.Geom)
                .NotNull().WithMessage(Messages.Error.GeomEmpty)
                .Must(g => g is not null && !g.IsEmpty)
                .WithMessage(Messages.Error.GeomEmpty);

            // Geom: tip kontrolü (Point | LineString | Polygon)
            RuleFor(x => x.Geom)
                .Must(g => g is Point || g is LineString || g is Polygon)
                .WithMessage(Messages.Error.GeomInvalid);

            // Geom: topolojik geçerliliği kontrol eder
            RuleFor(x => x.Geom)
                .Must(g =>
                {
                    if (g is null) return false;
                    var op = new IsValidOp(g);
                    return op.IsValid;
                })
                .WithMessage(Messages.Error.GeomInvalid);
        }

        /// <summary>
        /// DTO'yu doğrular; ilk hatada Fail, geçerliyse Success döner.
        /// </summary>
        public ApiResponse<bool> ValidateToApiResponse(FeatureDto dto, CancellationToken ct = default)
        {
            var result = this.Validate(dto);
            if (!result.IsValid)
                return ApiResponse<bool>.FailResponse(result.Errors[0].ErrorMessage);

            return ApiResponse<bool>.SuccessResponse(true, Messages.Success.Response);
        }
    }
}
