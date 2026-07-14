using Cabcon.Application.Common.Interfaces;
using MediatR;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record GenerateQuotationPdfQuery(int Id) : IRequest<byte[]>;

public class GenerateQuotationPdfQueryHandler : IRequestHandler<GenerateQuotationPdfQuery, byte[]>
{
    private readonly ISender _mediator;

    public GenerateQuotationPdfQueryHandler(ISender mediator)
    {
        _mediator = mediator;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task<byte[]> Handle(GenerateQuotationPdfQuery request, CancellationToken cancellationToken)
    {
        var quotation = await _mediator.Send(new GetQuotationDetailsQuery(request.Id), cancellationToken);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, QuestPDF.Infrastructure.Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Arial));

                page.Header().Element(header => ComposeHeader(header, quotation));
                page.Content().Element(content => ComposeContent(content, quotation));
                page.Footer().Element(ComposeFooter);
            });
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, QuotationDetailsDto quotation)
    {
        var logoPath = @"C:\Project\SKU\Cabcon\client\asset\Images\Logo.jpg";
        byte[] logoBytes = Array.Empty<byte>();
        if (System.IO.File.Exists(logoPath))
        {
            logoBytes = System.IO.File.ReadAllBytes(logoPath);
        }

        container.Row(row =>
        {
            row.RelativeItem().Column(column =>
            {
                if (logoBytes.Length > 0)
                {
                    column.Item().Height(50).Image(logoBytes);
                }
                else
                {
                    column.Item().Text("CABCON INDIA LTD").FontSize(20).SemiBold().FontColor(Colors.Blue.Darken2);
                }
                
                column.Item().PaddingTop(10).Text($"Quotation #: {quotation.QuotationNumber}");
                column.Item().Text($"Date: {quotation.QuotationDate:d}");
                column.Item().Text($"Validity: {quotation.ValidityDays} Days");
            });

            row.RelativeItem().AlignRight().Column(column =>
            {
                column.Item().Text("Customer Details").SemiBold();
                column.Item().Text(quotation.PartyName);
            });
        });
    }

    private void ComposeContent(IContainer container, QuotationDetailsDto quotation)
    {
        container.PaddingVertical(1, QuestPDF.Infrastructure.Unit.Centimetre).Column(column =>
        {
            column.Spacing(5);
            
            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(25); // #
                    columns.RelativeColumn();   // Description
                    columns.ConstantColumn(60); // Unit
                    columns.ConstantColumn(100); // Ex-GST Rate
                });

                table.Header(header =>
                {
                    header.Cell().Element(CellStyle).Text("#");
                    header.Cell().Element(CellStyle).Text("Description");
                    header.Cell().Element(CellStyle).AlignRight().Text("Unit");
                    header.Cell().Element(CellStyle).AlignRight().Text("Rate (Ex-GST)");

                    static IContainer CellStyle(IContainer container)
                    {
                        return container.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Black);
                    }
                });

                int index = 1;
                foreach (var item in quotation.Lines)
                {
                    table.Cell().Element(CellStyle).Text(index.ToString());
                    table.Cell().Element(CellStyle).Text(item.DescriptionSnapshot);
                    table.Cell().Element(CellStyle).AlignRight().Text(item.Unit);
                    table.Cell().Element(CellStyle).AlignRight().Text($"Rs {item.OfferExGst:N2}");
                    index++;

                    static IContainer CellStyle(IContainer container)
                    {
                        return container.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5);
                    }
                }
            });

            column.Item().PaddingTop(15).AlignRight().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });

                table.Cell().Text("Total Ex-GST:").SemiBold().AlignRight();
                table.Cell().Text($"Rs {quotation.TotalExGst:N2}").SemiBold().AlignRight();
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.AlignCenter().Text(x =>
        {
            x.Span("Page ");
            x.CurrentPageNumber();
            x.Span(" of ");
            x.TotalPages();
        });
    }
}
