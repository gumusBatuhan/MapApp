using FluentValidation;
using BasarApp.Application.Dtos;

namespace BasarApp.Application.Validation;

public class FeatureDtoValidator : AbstractValidator<FeatureDto>
{
    public FeatureDtoValidator()
    {
    }
}
